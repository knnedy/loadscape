import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, step } from "./step";
import { summarizeRun } from "./summary";
import type { Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

// A client sending 100 req/s to a service with a fixed error rate, so the
// numbers do not depend on how load and capacity interact.
function flaky(failRate: number, edge: Partial<EdgeInput> = {}): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 100 } },
      { id: "service", preset: "external", overrides: { failRate } },
    ],
    edges: [
      {
        id: "client-service",
        source: "client",
        target: "service",
        mode: "sync",
        ...edge,
      },
    ],
  };
}

function summarize(input: GraphInput, seconds: number) {
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  const history: Frame[] = [];
  for (let i = 0; i < seconds * 10; i++) {
    const result = step(graph, ordered.order, state, 1);
    state = result.state;
    if (state.tick % 10 === 0) history.push(result.frame);
  }

  const summary = summarizeRun(history, graph);
  if (!summary) throw new Error("No summary.");
  return summary;
}

const BREAKER = { breakerThreshold: 0.5, breakerCooldownMs: 2000 };

describe("summarizeRun with a tripping breaker", () => {
  // The breaker opens at tick 5 and cycles every 30 ticks: 20 open, then 10
  // half-open. One sample a second sees two open and one half-open per cycle.
  const summary = summarize(flaky(1, BREAKER), 60);

  it("totals the attempts that failed fast", () => {
    near(summary.generated, 6000);
    near(summary.successRate, 0);
    near(summary.shortCircuited, 5800);
  });

  it("describes the breaker's cycle", () => {
    expect(summary.breakers).toHaveLength(1);
    const [breaker] = summary.breakers;

    expect(breaker.id).toBe("client-service");
    expect(breaker.source).toBe("client");
    expect(breaker.target).toBe("service");
    expect(breaker.trips).toBe(20);
    expect(breaker.firstOpenedAt).toBe(1);
    expect(breaker.openSeconds).toBe(40);
    expect(breaker.halfOpenSeconds).toBe(20);
    near(breaker.shortCircuited, 5800);
  });

  it("blames the failing service for only the probes that reached it", () => {
    const service = summary.nodes.find((node) => node.id === "service");

    near(service?.refused ?? -1, 200);
    near(service?.refusedRetries ?? -1, 0);
    expect(summary.bottleneck).toEqual({ id: "service", kind: "refusing" });
  });
});

describe("summarizeRun without a breaker", () => {
  it("reports nothing short-circuited", () => {
    const summary = summarize(flaky(1), 30);

    near(summary.shortCircuited, 0);
    expect(summary.breakers).toEqual([]);
    near(summary.successRate, 0);
  });
});

describe("summarizeRun with a breaker that never trips", () => {
  it("lists no breakers while the failure share stays under the threshold", () => {
    const summary = summarize(flaky(0.3, BREAKER), 30);

    near(summary.shortCircuited, 0);
    expect(summary.breakers).toEqual([]);
    near(summary.successRate, 0.7);
  });
});

describe("summarizeRun with a breaker on an async edge", () => {
  it("ignores the policy", () => {
    const summary = summarize(flaky(1, { ...BREAKER, mode: "async" }), 30);

    near(summary.shortCircuited, 0);
    expect(summary.breakers).toEqual([]);
    near(summary.successRate, 1);
  });
});
