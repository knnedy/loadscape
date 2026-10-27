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
import { DT, createState, step } from "./step";
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
});

const edgeArb = fc.record({
  from: fc.nat(100),
  to: fc.nat(100),
  mode: fc.constantFrom("sync", "async"),
  sharePercent: fc.integer({ min: 0, max: 100 }),
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

  it("2. each queue moves by admitted minus served and stays within its buffer", () => {
    check((graph, frames) => {
      const buffers = new Map(
        graph.nodes.map((node) => [node.id, node.buffer]),
      );
      const previous = new Map<string, number>();

      for (const frame of frames) {
        for (const [id, node] of Object.entries(frame.nodes)) {
          const before = previous.get(id) ?? 0;
          expectClose(node.queue, before + (node.admitted - node.served) * DT);
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
});
