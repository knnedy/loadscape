import { beforeAll, describe, expect, it } from "vitest";
import {
  resolveGraph,
  type EdgeInput,
  type GraphInput,
} from "@/lib/simulation/presets";
import { summarizeRun, type RunSummary } from "@/lib/simulation/summary";
import type { Frame } from "@/lib/simulation/types";
import { TICKS_PER_SECOND, createSimulationStore } from "./simulation-store";

const near = (actual: number, expected: number, digits = 6) =>
  expect(actual).toBeCloseTo(expected, digits);

function link(
  source: string,
  target: string,
  extra: Partial<EdgeInput> = {},
): EdgeInput {
  return {
    id: `${source}->${target}`,
    source,
    target,
    mode: "sync",
    ...extra,
  };
}

// client -> load balancer (rate limited) -> two APIs -> cache -> database,
// with the first API also publishing to a queue that a worker drains.
const diagram: GraphInput = {
  nodes: [
    { id: "client", preset: "client", overrides: { rps: 400 } },
    { id: "lb", preset: "loadBalancer", overrides: { rateLimit: 1000 } },
    {
      id: "api-a",
      preset: "compute",
      overrides: { capacity: 300, latencyMs: 20 },
    },
    {
      id: "api-b",
      preset: "compute",
      overrides: { capacity: 300, latencyMs: 20 },
    },
    { id: "cache", preset: "cache", overrides: { hitRatio: 0.7 } },
    {
      id: "db",
      preset: "database",
      overrides: { capacity: 500, timeoutMs: 2000 },
    },
    {
      id: "queue",
      preset: "queue",
      overrides: { capacity: 100, buffer: 5000, timeoutMs: 30_000 },
    },
    { id: "worker", preset: "compute", overrides: { capacity: 150 } },
  ],
  edges: [
    link("client", "lb"),
    link("lb", "api-a"),
    link("lb", "api-b"),
    link("api-a", "cache"),
    link("api-b", "cache"),
    link("cache", "db", {
      retries: 2,
      backoffMs: 200,
      breakerThreshold: 0.5,
    }),
    link("api-a", "queue", { mode: "async" }),
    link("queue", "worker"),
  ],
};

// A 3x spike from 100 s to 160 s, the database killed from 300 s to 360 s,
// and a run length of 600 s, driven through the store the way the UI does.
function play() {
  const store = createSimulationStore();
  store.getState().configure(resolveGraph(diagram));
  store.getState().setProfile({
    kind: "spike",
    startS: 100,
    durationS: 60,
    factor: 3,
  });
  store.getState().play();
  store.getState().advance(300 * TICKS_PER_SECOND);
  store.getState().kill("db");
  store.getState().advance(60 * TICKS_PER_SECOND);
  store.getState().revive("db");
  store.getState().advance(240 * TICKS_PER_SECOND);
  return store;
}

function summarize(store: ReturnType<typeof play>): {
  history: Frame[];
  summary: RunSummary;
} {
  const { history, graph } = store.getState();
  if (!graph) throw new Error("No graph.");
  const summary = summarizeRun(history, graph);
  if (!summary) throw new Error("No summary.");
  return { history, summary };
}

function nodeOf(summary: RunSummary, id: string) {
  const node = summary.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`No node ${id}.`);
  return node;
}

describe("a full run of a realistic diagram", () => {
  let store: ReturnType<typeof play>;
  let history: Frame[];
  let summary: RunSummary;

  beforeAll(() => {
    store = play();
    ({ history, summary } = summarize(store));
  }, 60_000);

  it("finishes at the run length with every fault cleared", () => {
    expect(store.getState().status).toBe("finished");
    expect(store.getState().down.size).toBe(0);
    expect(history).toHaveLength(600);
    expect(summary.seconds).toBe(600);
  });

  it("never produces a number that is not finite", () => {
    for (const frame of history) {
      for (const node of Object.values(frame.nodes)) {
        for (const [key, value] of Object.entries(node)) {
          if (typeof value === "number") {
            expect(Number.isFinite(value), `node ${key}`).toBe(true);
          }
        }
      }
      for (const edge of Object.values(frame.edges)) {
        for (const [key, value] of Object.entries(edge)) {
          if (typeof value === "number") {
            expect(Number.isFinite(value), `edge ${key}`).toBe(true);
          }
        }
      }
      for (const [key, value] of Object.entries(frame.totals)) {
        expect(Number.isFinite(value), `totals ${key}`).toBe(true);
      }
    }
  });

  it("never completes more than it generated", () => {
    for (const frame of history) {
      expect(frame.totals.goodput).toBeLessThanOrEqual(
        frame.totals.generated + 1e-6,
      );
    }
  });

  it("serves everything before the spike", () => {
    near(history[49].totals.generated, 400);
    near(history[49].totals.goodput, 400);
    near(history[89].totals.goodput, 400);
  });

  it("loses requests to overload during the spike", () => {
    const frame = history[129];

    near(frame.totals.generated, 1200);
    expect(frame.totals.goodput).toBeLessThan(0.8 * frame.totals.generated);
    expect(frame.nodes.lb.limited).toBeGreaterThan(0);
    expect(frame.nodes["api-a"].dropped).toBeGreaterThan(0);
  });

  it("recovers fully once the spike is over", () => {
    near(history[249].totals.goodput, 400);
  });

  it("fails exactly the cache misses while the database is down", () => {
    // 30% of requests miss the cache and need the database, which is dead
    // whether its breaker is open or probing.
    for (let second = 301; second <= 360; second++) {
      near(history[second - 1].totals.goodput, 280);
    }
  });

  it("closes the breaker and recovers after the database is revived", () => {
    near(history[499].totals.goodput, 400);
    expect(history[499].edges["cache->db"].breaker).toBe("closed");
  });

  it("times the outage and attributes it to the database", () => {
    const db = nodeOf(summary, "db");

    expect(db.downSeconds).toBe(60);
    expect(db.firstDownAt).toBe(301);
    expect(summary.unavailable).toBeGreaterThan(0);
    expect(nodeOf(summary, "client").downSeconds).toBe(0);
  });

  it("trips the breaker on the database edge", () => {
    expect(summary.breakers.map((b) => b.id)).toContain("cache->db");
    const breaker = summary.breakers.find((b) => b.id === "cache->db");

    expect(breaker!.trips).toBeGreaterThanOrEqual(1);
    expect(breaker!.firstOpenedAt).not.toBeNull();
    expect(summary.shortCircuited).toBeGreaterThan(0);
  });

  it("reports the rate limiter, the queue and the overload", () => {
    expect(summary.throttled).toBeGreaterThan(0);
    expect(nodeOf(summary, "lb").limited).toBeGreaterThan(0);
    expect(nodeOf(summary, "lb").rateLimit).toBe(1000);

    expect(nodeOf(summary, "queue").peakQueue).toBeGreaterThan(0);
    expect(summary.timedOut).toBeGreaterThan(0);
    expect(summary.lost).toBeGreaterThan(0);
    expect(summary.dropped).toBeGreaterThan(0);
    expect(summary.bottleneck).not.toBeNull();
  });

  it("reports a success rate strictly between none and all", () => {
    expect(summary.successRate).toBeGreaterThan(0);
    expect(summary.successRate).toBeLessThan(1);
    expect(summary.succeeded).toBeLessThan(summary.generated);
    expect(summary.firstFailureAt).not.toBeNull();
  });

  it("estimates ordered end-to-end latency with a path from the load balancer", () => {
    const latency = summary.latency;

    expect(latency).not.toBeNull();
    expect(latency!.p50).toBeGreaterThan(0);
    expect(latency!.p50).toBeLessThan(latency!.p95);
    expect(latency!.p95).toBeLessThan(latency!.p99);
    expect(latency!.peak.at).toBeGreaterThanOrEqual(1);
    expect(latency!.peak.at).toBeLessThanOrEqual(600);
    expect(latency!.path.length).toBeGreaterThan(0);
    expect(latency!.path[0].id).toBe("lb");
  });

  it("gives the same summary when the run is repeated", () => {
    const again = summarize(play()).summary;

    expect(JSON.stringify(again)).toBe(JSON.stringify(summary));
  }, 60_000);
});
