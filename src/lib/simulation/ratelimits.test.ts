import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, rateBucketSize, step } from "./step";
import type { EdgeMode, Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

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

function limited(
  rps: number,
  limits: { rateLimit?: number; rateBurst?: number },
  mode: EdgeMode = "sync",
): GraphInput {
  const edge: EdgeInput = {
    id: "client-gateway",
    source: "client",
    target: "gateway",
    mode,
  };
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps } },
      { id: "gateway", preset: "gateway", overrides: limits },
    ],
    edges: [edge],
  };
}

describe("rateBucketSize", () => {
  it("defaults to one second of the rate", () => {
    expect(rateBucketSize(50, 0)).toBe(50);
  });

  it("uses an explicit burst", () => {
    expect(rateBucketSize(50, 120)).toBe(120);
  });

  it("is never smaller than one tick's refill", () => {
    expect(rateBucketSize(50, 1)).toBe(5);
    expect(rateBucketSize(0.5, 0)).toBe(0.5);
  });
});

describe("a rate limit with the default burst", () => {
  // 100 req/s into a 50 req/s limit with a bucket of 50: arrivals of 10 per
  // tick against a refill of 5, so the bucket empties over nine ticks.
  const frames = run(limited(100, { rateLimit: 50 }), 40);
  const gateway = (tick: number) => frames[tick - 1].nodes.gateway;

  it("admits everything while the bucket drains", () => {
    for (const tick of [1, 5, 9]) {
      near(gateway(tick).admitted, 100);
      near(gateway(tick).limited, 0);
      near(frames[tick - 1].totals.goodput, 100);
    }
  });

  it("then holds the admitted rate at the limit", () => {
    for (const tick of [10, 20, 40]) {
      near(gateway(tick).admitted, 50);
      near(gateway(tick).limited, 50);
      near(gateway(tick).dropped, 50);
      near(gateway(tick).served, 50);
      near(frames[tick - 1].totals.goodput, 50);
      near(frames[tick - 1].totals.throttled, 50);
      near(frames[tick - 1].totals.dropped, 50);
    }
  });

  it("marks the edge into the limited node as rejected", () => {
    const edge = frames[39].edges["client-gateway"];

    near(edge.flow, 100);
    near(edge.rejected, 50);
    near(edge.failed, 50);
  });
});

describe("a rate limit with an explicit burst", () => {
  const frames = run(limited(100, { rateLimit: 50, rateBurst: 100 }), 40);

  it("absorbs a longer burst before limiting", () => {
    near(frames[18].nodes.gateway.admitted, 100);
    near(frames[18].nodes.gateway.limited, 0);
    near(frames[19].nodes.gateway.admitted, 50);
    near(frames[19].nodes.gateway.limited, 50);
  });
});

describe("traffic under the limit", () => {
  it("is never limited", () => {
    const frames = run(limited(40, { rateLimit: 50 }), 40);

    for (const frame of frames) {
      near(frame.nodes.gateway.limited, 0);
      near(frame.totals.throttled, 0);
      near(frame.totals.goodput, 40);
    }
  });
});

describe("rate limits that are not configured", () => {
  it("are off by default", () => {
    const frames = run(limited(100, {}), 40);

    for (const frame of frames) {
      near(frame.nodes.gateway.limited, 0);
      near(frame.totals.throttled, 0);
      near(frame.totals.goodput, 100);
    }
  });
});

describe("limited requests", () => {
  it("do not use the node's capacity", () => {
    // 80 req/s into a node with capacity 100 and a limit of 50.
    const frames = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 80 } },
          {
            id: "api",
            preset: "compute",
            overrides: { capacity: 100, rateLimit: 50 },
          },
        ],
        edges: [
          { id: "client-api", source: "client", target: "api", mode: "sync" },
        ],
      },
      40,
    );
    const { api } = frames[39].nodes;

    near(api.limited, 30);
    near(api.dropped, 30);
    near(api.served, 50);
    near(api.utilization, 0.5);
    near(frames[39].totals.goodput, 50);
  });

  it("are lost silently behind an async edge", () => {
    const frames = run(limited(100, { rateLimit: 50 }, "async"), 40);
    const last = frames[39];

    near(last.totals.goodput, 100);
    near(last.totals.lost, 50);
    near(last.totals.dropped, 0);
    near(last.totals.throttled, 50);
  });
});
