import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type GraphInput } from "./presets";
import { createState, step } from "./step";
import { summarizeRun } from "./summary";
import type { EdgeMode, Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

// A service that fails half of what it receives whatever the load, so the
// totals have closed-form answers.
function flaky(mode: EdgeMode, retries?: number): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 100 } },
      { id: "service", preset: "external", overrides: { failRate: 0.5 } },
    ],
    edges: [
      {
        id: "client-service",
        source: "client",
        target: "service",
        mode,
        retries,
        backoffMs: 300,
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

describe("summarizeRun with retries", () => {
  it("totals the retried volume and names the connection that retried", () => {
    const summary = summarize(flaky("sync", 2), 20);

    near(summary.generated, 2000);
    near(summary.succeeded, 1750);
    near(summary.successRate, 0.875);
    near(summary.retried, 1500);

    expect(summary.retryEdges).toHaveLength(1);
    const [edge] = summary.retryEdges;
    expect(edge.id).toBe("client-service");
    expect(edge.source).toBe("client");
    expect(edge.target).toBe("service");
    near(edge.retried, 1500);
    near(edge.peakRate, 75);
  });

  it("splits a node's refusals into originals and retries", () => {
    const summary = summarize(flaky("sync", 2), 20);
    const service = nodeOf(summary, "service");

    near(service.refused, 1750);
    near(service.refusedRetries, 750);
    expect(summary.bottleneck).toEqual({ id: "service", kind: "refusing" });
  });

  it("reports no retries when none are configured", () => {
    const summary = summarize(flaky("sync"), 20);

    near(summary.retried, 0);
    expect(summary.retryEdges).toEqual([]);
    near(nodeOf(summary, "service").refusedRetries, 0);
    near(summary.successRate, 0.5);
  });

  it("reports no retries on an async connection", () => {
    const summary = summarize(flaky("async", 2), 20);

    near(summary.retried, 0);
    expect(summary.retryEdges).toEqual([]);
    near(summary.successRate, 1);
  });
});
