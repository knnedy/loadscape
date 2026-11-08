import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, step } from "./step";
import type { Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

function run(input: GraphInput, ticks: number, down: string[] = []): Frame {
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  let frame: Frame | null = null;
  for (let i = 0; i < ticks; i++) {
    const result = step(graph, ordered.order, state, 1, new Set(down));
    state = result.state;
    frame = result.frame;
  }
  if (!frame) throw new Error("No ticks were run.");
  return frame;
}

function edge(source: string, target: string): EdgeInput {
  return { id: `${source}-${target}`, source, target, mode: "sync" };
}

describe("own latency", () => {
  it("leaves out the calls a node makes (S1)", () => {
    const frame = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 80 } },
          {
            id: "api",
            preset: "compute",
            overrides: { capacity: 100, latencyMs: 20 },
          },
          {
            id: "db",
            preset: "database",
            overrides: { capacity: 200, latencyMs: 5 },
          },
        ],
        edges: [edge("client", "api"), edge("api", "db")],
      },
      20,
    );

    near(frame.nodes.api.ownLatencyMs, 100);
    near(frame.nodes.api.latencyMs, 108.333333333);
    near(frame.nodes.db.ownLatencyMs, 8.333333333);
    near(frame.nodes.db.latencyMs, 8.333333333);
    near(frame.nodes.client.ownLatencyMs, 0);
    near(frame.nodes.client.latencyMs, 108.333333333);
  });

  it("includes the wait in a buffer", () => {
    // After one tick a database at 80 req/s against 40 req/s holds 4
    // requests, which is 100 ms of waiting on top of the stretched service.
    const frame = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 80 } },
          {
            id: "db",
            preset: "database",
            overrides: { capacity: 40, buffer: 200, latencyMs: 5 },
          },
        ],
        edges: [edge("client", "db")],
      },
      1,
    );

    near(frame.nodes.db.ownLatencyMs, 200);
    near(frame.nodes.db.latencyMs, 200);
  });

  it("is the node's own delay before the cache thins what follows", () => {
    const frame = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 1000 } },
          {
            id: "cache",
            preset: "cache",
            overrides: { capacity: 5000, hitRatio: 0.8, latencyMs: 10 },
          },
          {
            id: "api",
            preset: "compute",
            overrides: { capacity: 1000, latencyMs: 20 },
          },
        ],
        edges: [edge("client", "cache"), edge("cache", "api")],
      },
      20,
    );

    near(frame.nodes.cache.ownLatencyMs, 12.5);
    near(frame.nodes.cache.latencyMs, 12.5 + 0.2 * 25);
    near(frame.nodes.api.ownLatencyMs, 25);
  });

  it("is zero for a queue", () => {
    const frame = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 50 } },
          {
            id: "queue",
            preset: "queue",
            overrides: { capacity: 100, buffer: 2000 },
          },
        ],
        edges: [edge("client", "queue")],
      },
      20,
    );

    near(frame.nodes.queue.ownLatencyMs, 0);
    near(frame.nodes.queue.latencyMs, 0);
  });

  it("is zero for a killed node", () => {
    const frame = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 80 } },
          { id: "db", preset: "database" },
        ],
        edges: [edge("client", "db")],
      },
      20,
      ["db"],
    );

    near(frame.nodes.db.ownLatencyMs, 0);
    near(frame.nodes.client.latencyMs, 0);
  });
});
