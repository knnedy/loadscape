import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type GraphInput } from "./presets";
import { createState, step } from "./step";
import { summarizeRun } from "./summary";
import type { Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

// 80 req/s into a line served at 40 req/s, so half of everything queues.
function line(
  preset: "queue" | "database",
  overrides: { buffer: number; timeoutMs?: number },
): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 80 } },
      { id: "target", preset, overrides: { capacity: 40, ...overrides } },
    ],
    edges: [
      { id: "client-target", source: "client", target: "target", mode: "sync" },
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

describe("summarizeRun with queue TTL", () => {
  const summary = summarize(
    line("queue", { buffer: 6000, timeoutMs: 10_000 }),
    60,
  );

  it("counts the expired messages as silent loss", () => {
    expect(summary.timedOut).toBeGreaterThan(800);
    expect(summary.timedOut).toBeLessThan(2400);
    near(summary.lost, summary.timedOut);
    near(summary.dropped, 0);
  });

  it("leaves callers untouched", () => {
    near(summary.successRate, 1);
    near(summary.succeeded, 4800);
    expect(summary.firstFailureAt).toBeNull();
  });

  it("attributes the expiries to the queue without calling it a refusal", () => {
    const queue = nodeOf(summary, "target");

    near(queue.timedOut, summary.timedOut);
    near(queue.refused, 0);
    expect(summary.bottleneck).toEqual({ id: "target", kind: "near-limit" });
  });
});

describe("summarizeRun with a service timeout", () => {
  const summary = summarize(
    line("database", { buffer: 200, timeoutMs: 2000 }),
    60,
  );

  it("counts timeouts as drops that failed the caller", () => {
    expect(summary.timedOut).toBeGreaterThan(0);
    near(summary.dropped, summary.timedOut);
    near(summary.lost, 0);
    expect(summary.successRate).toBeLessThan(1);
    expect(summary.successRate).toBeGreaterThan(0);
    expect(summary.firstFailureAt).not.toBeNull();
  });

  it("treats the timeouts as refusals by the service", () => {
    const db = nodeOf(summary, "target");

    near(db.timedOut, summary.timedOut);
    near(db.refused, summary.timedOut);
    expect(summary.bottleneck).toEqual({ id: "target", kind: "refusing" });
  });
});

describe("summarizeRun without timeouts", () => {
  it("reports none", () => {
    const summary = summarize(line("queue", { buffer: 6000 }), 30);

    near(summary.timedOut, 0);
    near(nodeOf(summary, "target").timedOut, 0);
    near(summary.lost, 0);
  });
});
