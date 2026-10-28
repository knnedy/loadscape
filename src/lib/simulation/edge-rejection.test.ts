import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, step } from "./step";
import type { Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

function edge(source: string, target: string, share?: number): EdgeInput {
  return { id: `${source}-${target}`, source, target, mode: "sync", share };
}

function lastFrame(input: GraphInput, ticks: number): Frame {
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  let frame: Frame | null = null;
  for (let i = 0; i < ticks; i++) {
    const result = step(graph, ordered.order, state, 1);
    state = result.state;
    frame = result.frame;
  }
  if (!frame) throw new Error("No ticks were run.");
  return frame;
}

describe("edge rejection", () => {
  it("marks only the edge into the overloaded node as rejected (S2)", () => {
    const { edges } = lastFrame(
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

    near(edges["api-db"].flow, 80);
    near(edges["api-db"].rejected, 40);
    near(edges["api-db"].failed, 40);

    near(edges["client-api"].flow, 80);
    near(edges["client-api"].rejected, 0);
    near(edges["client-api"].failed, 40);
  });

  it("counts a target's own failure rate as rejected (S8)", () => {
    const { edges } = lastFrame(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 100 } },
          { id: "api", preset: "compute" },
          { id: "db", preset: "database" },
          {
            id: "payment",
            preset: "external",
            overrides: { failRate: 0.05 },
          },
        ],
        edges: [
          edge("client", "api"),
          edge("api", "db", 1),
          edge("api", "payment", 0.2),
        ],
      },
      20,
    );

    near(edges["api-payment"].flow, 20);
    near(edges["api-payment"].rejected, 1);
    near(edges["api-db"].rejected, 0);
    near(edges["client-api"].rejected, 0);
  });

  it("rejects nothing on a healthy path (S1)", () => {
    const { edges } = lastFrame(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 80 } },
          { id: "api", preset: "compute", overrides: { capacity: 100 } },
          { id: "db", preset: "database", overrides: { capacity: 200 } },
        ],
        edges: [edge("client", "api"), edge("api", "db")],
      },
      20,
    );

    for (const frame of Object.values(edges)) {
      near(frame.rejected, 0);
      near(frame.failed, 0);
    }
  });

  it("never rejects more than has failed", () => {
    const { edges } = lastFrame(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 500 } },
          { id: "api", preset: "compute", overrides: { capacity: 120 } },
          {
            id: "db",
            preset: "database",
            overrides: { capacity: 40, buffer: 0, failRate: 0.1 },
          },
        ],
        edges: [edge("client", "api"), edge("api", "db")],
      },
      20,
    );

    for (const frame of Object.values(edges)) {
      expect(frame.rejected).toBeLessThanOrEqual(frame.failed + 1e-9);
    }
  });
});
