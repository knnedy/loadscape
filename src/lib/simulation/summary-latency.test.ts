import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { estimateLatency, exponential, sum } from "./latency-estimate";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, step } from "./step";
import { summarizeRun } from "./summary";
import type { Frame } from "./types";

const near = (actual: number, expected: number, digits = 6) =>
  expect(actual).toBeCloseTo(expected, digits);

function summarize(
  input: GraphInput,
  seconds: number,
  options: { load?: (tick: number) => number; down?: string[] } = {},
) {
  const { load = () => 1, down = [] } = options;
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  const history: Frame[] = [];
  for (let i = 0; i < seconds * 10; i++) {
    const result = step(graph, ordered.order, state, load(i), new Set(down));
    state = result.state;
    if (state.tick % 10 === 0) history.push(result.frame);
  }

  const summary = summarizeRun(history, graph);
  if (!summary) throw new Error("No summary.");
  return summary;
}

function edge(
  source: string,
  target: string,
  extra: Partial<EdgeInput> = {},
): EdgeInput {
  return { id: `${source}-${target}`, source, target, mode: "sync", ...extra };
}

describe("summarizeRun latency", () => {
  describe("on a healthy chain (S1)", () => {
    const summary = summarize(
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
    const expected = estimateLatency(
      sum(exponential(100), exponential(5 / 0.6)),
    );

    it("estimates the end-to-end percentiles from the chain's moments", () => {
      expect(summary.latency).not.toBeNull();
      const latency = summary.latency!;

      near(latency.meanMs, 108.333333, 4);
      near(latency.p50, expected.p50, 2);
      near(latency.p95, expected.p95, 2);
      near(latency.p99, expected.p99, 2);
      expect(latency.p50).toBeLessThan(latency.p95);
      expect(latency.p95).toBeLessThan(latency.p99);
    });

    it("peaks at the first second when every second is the same", () => {
      const { peak } = summary.latency!;

      expect(peak.at).toBe(1);
      near(peak.p99, expected.p99, 2);
    });

    it("follows the chain and reports each hop's own delay", () => {
      const { path } = summary.latency!;

      expect(path.map((hop) => hop.id)).toEqual(["api", "db"]);
      near(path[0].ownMs, 100);
      near(path[1].ownMs, 8.333333);
      near(path[0].utilization, 0.8);
      near(path[1].utilization, 0.4);
    });
  });

  describe("through a traffic spike", () => {
    // 50 req/s into an API of 100 req/s: 40 ms until a 1.8x surge from tick
    // 51 takes it to 90% busy and 200 ms.
    const summary = summarize(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 50 } },
          {
            id: "api",
            preset: "compute",
            overrides: { capacity: 100, latencyMs: 20 },
          },
        ],
        edges: [edge("client", "api")],
      },
      10,
      { load: (tick) => (tick >= 50 ? 1.8 : 1) },
    );

    it("finds the worst second and its exponential tail", () => {
      const { peak } = summary.latency!;

      expect(peak.at).toBe(6);
      near(peak.p99, 4.60517 * 200, 1);
    });

    it("weights the run by the traffic each second carried", () => {
      // Five seconds of 50 req/s at 40 ms and five of 90 req/s at 200 ms.
      near(summary.latency!.meanMs, (50 * 40 + 90 * 200) / 140, 4);
    });

    it("keeps the run-wide tail below the worst second's", () => {
      const { latency } = summary;

      expect(latency!.p99).toBeLessThan(latency!.peak.p99);
      expect(latency!.p50).toBeLessThan(latency!.p99);
    });

    it("names the busy node on the path at the peak", () => {
      const { path } = summary.latency!;

      expect(path.map((hop) => hop.id)).toEqual(["api"]);
      near(path[0].ownMs, 200, 3);
      near(path[0].utilization, 0.9, 6);
    });
  });

  describe("with two branches", () => {
    const summary = summarize(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 100 } },
          {
            id: "api",
            preset: "compute",
            overrides: { capacity: 1000, latencyMs: 10 },
          },
          {
            id: "db",
            preset: "database",
            overrides: { capacity: 1000, latencyMs: 5 },
          },
          {
            id: "slow",
            preset: "compute",
            overrides: { capacity: 1000, latencyMs: 100 },
          },
        ],
        edges: [edge("client", "api"), edge("api", "db"), edge("api", "slow")],
      },
      10,
    );

    it("follows the slower one", () => {
      const { path } = summary.latency!;

      expect(path.map((hop) => hop.id)).toEqual(["api", "slow"]);
      near(path[1].ownMs, 100 / 0.9, 4);
    });
  });

  describe("with an async call", () => {
    it("leaves it off the path", () => {
      const summary = summarize(
        {
          nodes: [
            { id: "client", preset: "client", overrides: { rps: 100 } },
            {
              id: "api",
              preset: "compute",
              overrides: { capacity: 1000, latencyMs: 10 },
            },
            {
              id: "worker",
              preset: "compute",
              overrides: { capacity: 1000, latencyMs: 500 },
            },
          ],
          edges: [
            edge("client", "api"),
            edge("api", "worker", { mode: "async" }),
          ],
        },
        10,
      );

      expect(summary.latency!.path.map((hop) => hop.id)).toEqual(["api"]);
      near(summary.latency!.meanMs, 10 / 0.9, 4);
    });
  });

  describe("with nothing to measure", () => {
    it("reports no latency for a lone client", () => {
      const summary = summarize(
        {
          nodes: [{ id: "client", preset: "client", overrides: { rps: 80 } }],
          edges: [],
        },
        5,
      );

      expect(summary.latency).toBeNull();
    });

    it("reports no latency when everything downstream is killed", () => {
      const summary = summarize(
        {
          nodes: [
            { id: "client", preset: "client", overrides: { rps: 80 } },
            { id: "db", preset: "database" },
          ],
          edges: [edge("client", "db")],
        },
        5,
        { down: ["db"] },
      );

      expect(summary.latency).toBeNull();
    });
  });
});
