import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type GraphInput } from "./presets";
import { createState, step } from "./step";
import { summarizeRun } from "./summary";
import type { EdgeMode, Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

// 100 req/s into a gateway. With a limit of 50 and the default bucket of 50,
// the bucket drains over nine ticks and the limiter turns away half of
// everything from tick 10 on, which is the first sample of the run.
function gateway(
  limits: { rateLimit?: number; rateBurst?: number },
  mode: EdgeMode = "sync",
  rps = 100,
): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps } },
      { id: "gateway", preset: "gateway", overrides: limits },
    ],
    edges: [
      {
        id: "client-gateway",
        source: "client",
        target: "gateway",
        mode,
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

function nodeOf(summary: ReturnType<typeof summarize>, id: string) {
  const node = summary.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`No node ${id}.`);
  return node;
}

describe("summarizeRun with a rate limit", () => {
  const summary = summarize(gateway({ rateLimit: 50 }), 30);

  it("totals the throttled volume and counts it as drops that fail callers", () => {
    near(summary.generated, 3000);
    near(summary.succeeded, 1500);
    near(summary.successRate, 0.5);
    near(summary.throttled, 1500);
    near(summary.dropped, 1500);
    near(summary.lost, 0);
    expect(summary.firstFailureAt).toBe(1);
  });

  it("attributes the throttling to the limiting node", () => {
    const limiter = nodeOf(summary, "gateway");

    near(limiter.limited, 1500);
    expect(limiter.rateLimit).toBe(50);
    expect(limiter.firstLimitedAt).toBe(1);
    near(limiter.refused, 1500);
    expect(summary.bottleneck).toEqual({ id: "gateway", kind: "refusing" });
  });

  it("never marks the client as limited", () => {
    const client = nodeOf(summary, "client");

    near(client.limited, 0);
    expect(client.rateLimit).toBe(0);
    expect(client.firstLimitedAt).toBeNull();
  });
});

describe("summarizeRun with a rate limit behind an async edge", () => {
  const summary = summarize(gateway({ rateLimit: 50 }, "async"), 30);

  it("reports the throttling as silent loss and leaves callers untouched", () => {
    near(summary.throttled, 1500);
    near(summary.lost, 1500);
    near(summary.dropped, 0);
    near(summary.successRate, 1);
    expect(summary.firstFailureAt).toBeNull();
  });
});

describe("summarizeRun with traffic under the limit", () => {
  const summary = summarize(gateway({ rateLimit: 50 }, "sync", 40), 30);

  it("throttles nothing", () => {
    near(summary.throttled, 0);
    near(nodeOf(summary, "gateway").limited, 0);
    expect(nodeOf(summary, "gateway").firstLimitedAt).toBeNull();
    near(summary.successRate, 1);
    expect(summary.bottleneck).toBeNull();
  });
});

describe("summarizeRun without a rate limit", () => {
  const summary = summarize(gateway({}), 30);

  it("reports no limiting", () => {
    near(summary.throttled, 0);
    near(nodeOf(summary, "gateway").limited, 0);
    expect(nodeOf(summary, "gateway").rateLimit).toBe(0);
    near(summary.successRate, 1);
  });
});
