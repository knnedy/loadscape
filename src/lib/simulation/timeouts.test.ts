import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type GraphInput } from "./presets";
import { createState, step, timeoutTicks } from "./step";
import type { Frame } from "./types";

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

// 80 req/s into a line served at 40 req/s: half of everything has to wait.
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

describe("timeoutTicks", () => {
  it("rounds to whole ticks and treats 0 as never", () => {
    expect(timeoutTicks(0)).toBe(0);
    expect(timeoutTicks(-5)).toBe(0);
    expect(timeoutTicks(100)).toBe(1);
    expect(timeoutTicks(2000)).toBe(20);
    expect(timeoutTicks(10_000)).toBe(100);
  });

  it("never rounds a timeout down to nothing", () => {
    expect(timeoutTicks(10)).toBe(1);
  });
});

describe("queue timeouts", () => {
  const frames = run(line("queue", { buffer: 6000, timeoutMs: 10_000 }), 600);

  it("let requests wait until the timeout, with nothing lost before it", () => {
    near(frames[149].nodes.target.queue, 600);
    near(frames[149].nodes.target.timedOut, 0);
    near(frames[149].totals.lost, 0);
  });

  it("settle into a steady state of serving 40 and timing out 40", () => {
    for (const index of [399, 599]) {
      const { nodes, totals } = frames[index];
      near(nodes.target.served, 40);
      near(nodes.target.timedOut, 40);
      near(nodes.target.queue, 804);
      near(nodes.target.lagSeconds, 10);
      near(totals.timedOut, 40);
    }
  });

  it("are silent: callers still succeed and the loss is reported as lost", () => {
    const { totals } = frames[599];

    near(totals.goodput, 80);
    near(totals.lost, 40);
    near(totals.dropped, 0);
  });
});

describe("waiting line timeouts on a service", () => {
  const frames = run(line("database", { buffer: 200, timeoutMs: 2000 }), 300);

  it("fail the caller's request, unlike a queue", () => {
    const { nodes, edges, totals } = frames[299];

    near(nodes.target.served, 40);
    near(nodes.target.timedOut, 40);
    near(nodes.target.dropped, 0);
    near(nodes.target.queue, 164);
    near(totals.goodput, 40);
    near(totals.dropped, 40);
    near(totals.lost, 0);
    near(totals.timedOut, 40);
    near(edges["client-target"].rejected, 40);
  });

  it("cap the wait in the response time at the timeout", () => {
    near(frames[299].nodes.target.latencyMs, 2100);
  });
});

describe("timeouts that are not configured", () => {
  it("never happen by default", () => {
    const frames = run(line("queue", { buffer: 6000 }), 300);

    near(frames[299].nodes.target.timedOut, 0);
    near(frames[299].nodes.target.queue, 1200);
    near(frames[299].nodes.target.lagSeconds, 30);
    near(frames[299].totals.timedOut, 0);
  });

  it("do nothing without a waiting line", () => {
    const frames = run(line("database", { buffer: 0, timeoutMs: 2000 }), 20);

    near(frames[19].nodes.target.timedOut, 0);
    near(frames[19].nodes.target.dropped, 40);
    near(frames[19].totals.goodput, 40);
  });
});
