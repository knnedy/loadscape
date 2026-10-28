import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, step } from "./step";
import { summarizeRun } from "./summary";
import type { EdgeMode, Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

function edge(
  source: string,
  target: string,
  mode: EdgeMode = "sync",
): EdgeInput {
  return { id: `${source}-${target}`, source, target, mode };
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

function healthy(rps: number): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps } },
      { id: "api", preset: "compute", overrides: { capacity: 100 } },
      { id: "db", preset: "database", overrides: { capacity: 200 } },
    ],
    edges: [edge("client", "api"), edge("api", "db")],
  };
}

function queueChain(mode: EdgeMode): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 80 } },
      { id: "api", preset: "compute", overrides: { capacity: 100 } },
      {
        id: "queue",
        preset: "queue",
        overrides: { capacity: 40, buffer: 6000 },
      },
      { id: "db", preset: "database", overrides: { capacity: 50 } },
    ],
    edges: [
      edge("client", "api"),
      edge("api", "queue", mode),
      edge("queue", "db"),
    ],
  };
}

describe("summarizeRun", () => {
  it("returns nothing for an empty history", () => {
    const graph = resolveGraph({ nodes: [], edges: [] });

    expect(summarizeRun([], graph)).toBeNull();
  });

  it("reports a healthy path with nothing to flag (S1)", () => {
    const summary = summarize(healthy(80), 20);

    expect(summary.seconds).toBe(20);
    near(summary.generated, 1600);
    near(summary.succeeded, 1600);
    near(summary.successRate, 1);
    near(summary.dropped, 0);
    near(summary.lost, 0);
    near(summary.minGoodput, 80);
    expect(summary.firstFailureAt).toBeNull();
    expect(summary.bottleneck).toBeNull();
    near(nodeOf(summary, "api").peakUtilization, 0.8);
  });

  it("flags the busiest node when nothing is refused but one runs hot", () => {
    const summary = summarize(healthy(92), 20);

    near(summary.successRate, 1);
    expect(summary.bottleneck).toEqual({ id: "api", kind: "near-limit" });
  });

  it("names the node that refuses requests, not the caller it hurts (S2)", () => {
    const summary = summarize(
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
        edges: [edge("client", "api"), edge("api", "db")],
      },
      20,
    );

    near(summary.generated, 1600);
    near(summary.succeeded, 800);
    near(summary.successRate, 0.5);
    near(summary.dropped, 800);
    near(summary.lost, 0);
    expect(summary.firstFailureAt).toBe(1);
    expect(summary.bottleneck).toEqual({ id: "db", kind: "refusing" });
    expect(summary.nodes.map((n) => n.id)).toEqual(["db", "api", "client"]);

    const db = nodeOf(summary, "db");
    near(db.refused, 800);
    expect(db.firstRefusedAt).toBe(1);
    expect(db.saturatedSeconds).toBe(20);
    near(nodeOf(summary, "api").refused, 0);
  });

  it("shows a queue filling and then failing callers (S3a)", () => {
    const summary = summarize(queueChain("sync"), 160);

    near(summary.generated, 12800);
    near(summary.succeeded, 12400);
    near(summary.averageGoodput, 77.5);
    near(summary.minGoodput, 40);
    near(summary.dropped, 400);
    near(summary.lost, 0);
    expect(summary.firstFailureAt).toBe(151);
    expect(summary.bottleneck).toEqual({ id: "queue", kind: "refusing" });

    const queue = nodeOf(summary, "queue");
    near(queue.peakQueue, 6000);
    near(queue.peakLagSeconds, 150);
    expect(queue.fullAt).toBe(150);
    expect(queue.firstRefusedAt).toBe(151);
    near(queue.refused, 400);
  });

  it("reports an async queue's overflow as lost, with goodput intact (S3b)", () => {
    const summary = summarize(queueChain("async"), 160);

    near(summary.successRate, 1);
    near(summary.succeeded, 12800);
    near(summary.dropped, 0);
    near(summary.lost, 400);
    expect(summary.firstFailureAt).toBeNull();
    expect(summary.bottleneck).toEqual({ id: "queue", kind: "refusing" });
    near(nodeOf(summary, "queue").refused, 400);
  });
});
