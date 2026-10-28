import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, retryDelayTicks, step } from "./step";
import type { EdgeMode, Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

function edge(
  source: string,
  target: string,
  mode: EdgeMode = "sync",
  retries?: number,
  backoffMs?: number,
): EdgeInput {
  return {
    id: `${source}-${target}`,
    source,
    target,
    mode,
    retries,
    backoffMs,
  };
}

function run(input: GraphInput, ticks: number): Frame[] {
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  const frames: Frame[] = [];
  for (let i = 0; i < ticks; i++) {
    const result = step(graph, ordered.order, state, 1);
    state = result.state;
    frames.push(result.frame);
  }
  return frames;
}

// A service that fails half of what it receives, whatever the load, so the
// numbers do not depend on how retries and capacity interact.
function flaky(
  mode: EdgeMode,
  retries?: number,
  backoffMs?: number,
): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 100 } },
      { id: "service", preset: "external", overrides: { failRate: 0.5 } },
    ],
    edges: [edge("client", "service", mode, retries, backoffMs)],
  };
}

describe("retry delays", () => {
  it("doubles with each attempt and never drops below one tick", () => {
    expect(retryDelayTicks(300, 1)).toBe(3);
    expect(retryDelayTicks(300, 2)).toBe(6);
    expect(retryDelayTicks(300, 3)).toBe(12);
    expect(retryDelayTicks(0, 1)).toBe(1);
    expect(retryDelayTicks(20, 1)).toBe(1);
  });
});

describe("retries", () => {
  it("do nothing by default", () => {
    const frames = run(flaky("sync"), 30);
    const last = frames[frames.length - 1];

    near(last.totals.goodput, 50);
    near(last.totals.retries, 0);
    near(last.edges["client-service"].retry, 0);
    near(last.edges["client-service"].flow, 100);
  });

  it("raise goodput to the chance that any attempt succeeds", () => {
    const frames = run(flaky("sync", 2, 300), 40);

    near(frames[0].totals.goodput, 87.5);
    near(frames[39].totals.goodput, 87.5);
  });

  it("re-enter the target after the first backoff", () => {
    const frames = run(flaky("sync", 2, 300), 40);

    for (const index of [0, 1, 2]) {
      near(frames[index].edges["client-service"].retry, 0);
      near(frames[index].edges["client-service"].flow, 100);
    }
    near(frames[3].edges["client-service"].retry, 50);
    near(frames[3].edges["client-service"].flow, 150);
    near(frames[8].edges["client-service"].retry, 50);
  });

  it("reach a steady load once every attempt level is in play", () => {
    const frames = run(flaky("sync", 2, 300), 40);

    for (const index of [9, 25, 39]) {
      const { edges, nodes, totals } = frames[index];
      near(edges["client-service"].retry, 75);
      near(edges["client-service"].flow, 175);
      near(edges["client-service"].failed, 87.5);
      near(edges["client-service"].rejected, 87.5);
      near(nodes.service.offered, 175);
      near(totals.retries, 75);
    }
  });

  it("stop after the configured number of retries", () => {
    const frames = run(flaky("sync", 1, 100), 30);

    near(frames[1].edges["client-service"].retry, 50);
    near(frames[29].edges["client-service"].retry, 50);
    near(frames[29].edges["client-service"].flow, 150);
    near(frames[29].totals.goodput, 75);
  });

  it("are ignored on an async connection", () => {
    const frames = run(flaky("async", 2, 300), 30);

    for (const frame of frames) {
      near(frame.edges["client-service"].retry, 0);
      near(frame.totals.goodput, 100);
    }
    near(frames[29].nodes.service.offered, 100);
  });

  it("amplify the load on a saturated target", () => {
    const frames = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 80 } },
          { id: "api", preset: "compute", overrides: { capacity: 100 } },
          {
            id: "db",
            preset: "database",
            overrides: { capacity: 40, buffer: 0 },
          },
        ],
        edges: [edge("client", "api"), edge("api", "db", "sync", 2, 100)],
      },
      200,
    );

    const tail = frames.slice(100);
    const average =
      tail.reduce((sum, frame) => sum + frame.nodes.db.offered, 0) /
      tail.length;
    expect(average).toBeGreaterThan(120);
    expect(frames[199].totals.retries).toBeGreaterThan(0);

    for (const frame of frames) {
      const { db } = frame.nodes;
      expect(db.served).toBeLessThanOrEqual(40 + 1e-9);
      near(db.offered, db.admitted + db.dropped);
    }
  });
});
