import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import {
  resolveGraph,
  type EdgeInput,
  type GraphInput,
  type NodeInput,
  type PresetKey,
} from "./presets";
import { DT, PROBE_SHARE, createState, step, timeoutTicks } from "./step";
import type { Frame, SimGraph } from "./types";

const NUM_RUNS = 200;

const NODE_PRESETS: PresetKey[] = [
  "cache",
  "loadBalancer",
  "gateway",
  "compute",
  "database",
  "queue",
  "external",
];

const nodeArb = fc.record({
  preset: fc.constantFrom(...NODE_PRESETS),
  capacity: fc.integer({ min: 1, max: 5000 }),
  instances: fc.integer({ min: 1, max: 4 }),
  buffer: fc.integer({ min: 0, max: 5000 }),
  hitPercent: fc.integer({ min: 0, max: 100 }),
  failPercent: fc.integer({ min: 0, max: 50 }),
  fanout: fc.constantFrom("all", "split"),
  timeoutMs: fc.constantFrom(0, 0, 200, 1000, 5000, 20_000),
});

const edgeArb = fc.record({
  from: fc.nat(100),
  to: fc.nat(100),
  mode: fc.constantFrom("sync", "async"),
  sharePercent: fc.integer({ min: 0, max: 100 }),
  retries: fc.constantFrom(0, 0, 1, 2, 3, 5),
  backoffMs: fc.integer({ min: 0, max: 2000 }),
  breakerThreshold: fc.constantFrom(0, 0, 0.3, 0.5, 0.9),
  breakerCooldownMs: fc.constantFrom(100, 1000, 5000),
});

const scenarioArb = fc
  .record({
    nodes: fc.array(nodeArb, { minLength: 1, maxLength: 7 }),
    edges: fc.array(edgeArb, { maxLength: 14 }),
    rps: fc.integer({ min: 1, max: 5000 }),
    loads: fc.array(fc.integer({ min: 0, max: 400 }), {
      minLength: 1,
      maxLength: 60,
    }),
  })
  .map(({ nodes, edges, rps, loads }) => {
    const nodeInputs: NodeInput[] = [
      { id: "n0", preset: "client", overrides: { rps } },
      ...nodes.map((node, index) => ({
        id: `n${index + 1}`,
        preset: node.preset,
        overrides: {
          capacity: node.capacity,
          instances: node.instances,
          buffer: node.buffer,
          hitRatio: node.hitPercent / 100,
          failRate: node.failPercent / 100,
          fanout: node.fanout,
          timeoutMs: node.timeoutMs,
        },
      })),
    ];

    const edgeInputs = new Map<string, EdgeInput>();
    for (const edge of edges) {
      const a = edge.from % nodeInputs.length;
      const b = edge.to % nodeInputs.length;
      if (a === b) continue;
      const source = Math.min(a, b);
      const target = Math.max(a, b);
      const id = `n${source}-n${target}`;
      if (edgeInputs.has(id)) continue;
      edgeInputs.set(id, {
        id,
        source: `n${source}`,
        target: `n${target}`,
        mode: edge.mode,
        share: edge.sharePercent / 100,
        retries: edge.retries,
        backoffMs: edge.backoffMs,
        breakerThreshold: edge.breakerThreshold,
        breakerCooldownMs: edge.breakerCooldownMs,
      });
    }

    const input: GraphInput = {
      nodes: nodeInputs,
      edges: [...edgeInputs.values()],
    };

    return { input, loads: loads.map((load) => load / 100) };
  });

function simulate(
  input: GraphInput,
  loads: number[],
): { graph: SimGraph; frames: Frame[] } {
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  const frames: Frame[] = [];
  for (const load of loads) {
    const result = step(graph, ordered.order, state, load);
    state = result.state;
    frames.push(result.frame);
  }
  return { graph, frames };
}

function check(assertion: (graph: SimGraph, frames: Frame[]) => void) {
  fc.assert(
    fc.property(scenarioArb, ({ input, loads }) => {
      const { graph, frames } = simulate(input, loads);
      assertion(graph, frames);
    }),
    { numRuns: NUM_RUNS },
  );
}

const tolerance = (...values: number[]) =>
  1e-6 * Math.max(1, ...values.map(Math.abs));

function expectClose(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
    tolerance(actual, expected),
  );
}

function expectNonNegative(value: number, slack = 1e-9) {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(-slack);
}

describe("engine invariants", () => {
  it("1. arrivals equal admitted plus dropped at every node", () => {
    check((_, frames) => {
      for (const frame of frames) {
        for (const node of Object.values(frame.nodes)) {
          expectClose(node.offered, node.admitted + node.dropped);
        }
      }
    });
  });

  it("2. each queue moves by admitted minus served minus timed out, and stays within its buffer", () => {
    check((graph, frames) => {
      const buffers = new Map(
        graph.nodes.map((node) => [node.id, node.buffer]),
      );
      const previous = new Map<string, number>();

      for (const frame of frames) {
        for (const [id, node] of Object.entries(frame.nodes)) {
          const before = previous.get(id) ?? 0;
          expectClose(
            node.queue,
            before + (node.admitted - node.served - node.timedOut) * DT,
          );
          expect(node.queue).toBeGreaterThanOrEqual(0);
          expect(node.queue).toBeLessThanOrEqual(buffers.get(id) ?? 0);
          previous.set(id, node.queue);
        }
      }
    });
  });

  it("3. nothing is negative and every fraction is between 0 and 1", () => {
    check((_, frames) => {
      for (const frame of frames) {
        for (const node of Object.values(frame.nodes)) {
          for (const value of Object.values(node)) expectNonNegative(value);
          expect(node.utilization).toBeLessThanOrEqual(1);
        }
        for (const edge of Object.values(frame.edges)) {
          expectNonNegative(edge.flow);
          expectNonNegative(edge.failed, tolerance(edge.flow));
          expect(edge.failed).toBeLessThanOrEqual(
            edge.flow + tolerance(edge.flow),
          );
        }
        for (const value of Object.values(frame.totals)) {
          expectNonNegative(value);
        }
      }
    });
  });

  it("4. goodput never exceeds generated load", () => {
    check((_, frames) => {
      for (const frame of frames) {
        const { goodput, generated } = frame.totals;
        expect(goodput).toBeLessThanOrEqual(generated + tolerance(generated));
      }
    });
  });

  it("5. the same input produces byte-identical frames", () => {
    fc.assert(
      fc.property(scenarioArb, ({ input, loads }) => {
        const first = JSON.stringify(simulate(input, loads).frames);
        const second = JSON.stringify(simulate(input, loads).frames);
        expect(second).toBe(first);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("6. retries are part of each edge's flow, add up in the totals, and only run where a policy applies", () => {
    check((graph, frames) => {
      const roles = new Map(graph.nodes.map((node) => [node.id, node.role]));
      const inert = new Set(
        graph.edges
          .filter(
            (edge) =>
              edge.retries === 0 ||
              edge.mode === "async" ||
              roles.get(edge.source) === "queue",
          )
          .map((edge) => edge.id),
      );

      for (const frame of frames) {
        let sum = 0;
        for (const [id, edge] of Object.entries(frame.edges)) {
          expectNonNegative(edge.retry);
          expect(edge.retry).toBeLessThanOrEqual(
            edge.flow + tolerance(edge.flow),
          );
          if (inert.has(id)) expect(edge.retry).toBe(0);
          sum += edge.retry;
        }
        expectClose(frame.totals.retries, sum);
      }
    });
  });

  it("7. timeouts only happen where a line and a timeout exist, stay within the timeout, and add up in the totals", () => {
    check((graph, frames) => {
      const inert = new Set(
        graph.nodes
          .filter((node) => node.timeoutMs === 0 || node.buffer === 0)
          .map((node) => node.id),
      );
      const limits = new Map(
        graph.nodes
          .filter(
            (node) =>
              node.role === "queue" && node.timeoutMs > 0 && node.buffer > 0,
          )
          .map((node) => [node.id, timeoutTicks(node.timeoutMs) * DT]),
      );

      for (const frame of frames) {
        let timedOut = 0;
        let refused = 0;
        for (const [id, node] of Object.entries(frame.nodes)) {
          if (inert.has(id)) expect(node.timedOut).toBe(0);
          const limit = limits.get(id);
          if (limit !== undefined) {
            expect(node.lagSeconds).toBeLessThanOrEqual(limit + 1e-9);
          }
          timedOut += node.timedOut;
          refused += node.dropped + node.timedOut;
        }
        expectClose(frame.totals.timedOut, timedOut);
        expectClose(frame.totals.dropped + frame.totals.lost, refused);
      }
    });
  });

  it("8. breakers only exist where a policy applies, block only while open or probing, and move through valid states", () => {
    const allowed: Record<string, string[]> = {
      closed: ["closed", "open"],
      open: ["open", "half-open"],
      "half-open": ["half-open", "open", "closed"],
    };

    check((graph, frames) => {
      const roles = new Map(graph.nodes.map((node) => [node.id, node.role]));
      const inert = new Set(
        graph.edges
          .filter(
            (edge) =>
              edge.breakerThreshold === 0 ||
              edge.mode === "async" ||
              roles.get(edge.source) === "queue",
          )
          .map((edge) => edge.id),
      );
      const previous = new Map<string, string>();

      for (const frame of frames) {
        let blocked = 0;
        for (const [id, edge] of Object.entries(frame.edges)) {
          expectNonNegative(edge.blocked);
          blocked += edge.blocked;

          if (inert.has(id)) {
            expect(edge.breaker).toBe("off");
            expect(edge.blocked).toBe(0);
            continue;
          }

          expect(edge.breaker).not.toBe("off");
          if (edge.breaker === "closed") expect(edge.blocked).toBe(0);
          if (edge.breaker === "open") expect(edge.flow).toBe(0);
          if (edge.breaker === "half-open") {
            expectClose(edge.flow, (edge.flow + edge.blocked) * PROBE_SHARE);
          }

          const before = previous.get(id);
          if (before) expect(allowed[before]).toContain(edge.breaker);
          previous.set(id, edge.breaker);
        }
        expectClose(frame.totals.shortCircuited, blocked);
      }
    });
  });
});
