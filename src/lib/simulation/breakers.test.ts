import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { breakerCooldownTicks, createState, step } from "./step";
import type { Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

function run(inputFor: (tick: number) => GraphInput, ticks: number): Frame[] {
  let state = createState();
  const frames: Frame[] = [];
  for (let i = 0; i < ticks; i++) {
    const graph = resolveGraph(inputFor(i + 1));
    const ordered = orderGraph(graph);
    if (!ordered.ok) throw new Error(ordered.error);
    const result = step(graph, ordered.order, state, 1);
    state = result.state;
    frames.push(result.frame);
  }
  return frames;
}

// A client sending 100 req/s to a service with a fixed error rate, so the
// breaker's behaviour does not depend on how load and capacity interact.
function service(failRate: number, edge: Partial<EdgeInput> = {}): GraphInput {
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

const TRIPPING = { breakerThreshold: 0.5, breakerCooldownMs: 2000 };

describe("breakerCooldownTicks", () => {
  it("rounds to whole ticks and never below one", () => {
    expect(breakerCooldownTicks(2000)).toBe(20);
    expect(breakerCooldownTicks(100)).toBe(1);
    expect(breakerCooldownTicks(10)).toBe(1);
  });
});

describe("a breaker on a service that always fails", () => {
  const frames = run(() => service(1, TRIPPING), 60);
  const edge = (tick: number) => frames[tick - 1].edges["client-service"];

  it("stays closed until the smoothed failure share reaches the threshold", () => {
    for (const tick of [1, 2, 3, 4]) {
      expect(edge(tick).breaker).toBe("closed");
      near(edge(tick).flow, 100);
      near(edge(tick).blocked, 0);
    }
  });

  it("opens on the next tick and blocks everything for the cool-down", () => {
    for (const tick of [5, 14, 24]) {
      expect(edge(tick).breaker).toBe("open");
      near(edge(tick).flow, 0);
      near(edge(tick).blocked, 100);
      near(frames[tick - 1].totals.shortCircuited, 100);
    }
  });

  it("then probes with a tenth of the calls", () => {
    for (const tick of [25, 30, 34]) {
      expect(edge(tick).breaker).toBe("half-open");
      near(edge(tick).flow, 10);
      near(edge(tick).blocked, 90);
    }
  });

  it("opens again when the probes fail", () => {
    expect(edge(35).breaker).toBe("open");
    expect(edge(54).breaker).toBe("open");
    expect(edge(55).breaker).toBe("half-open");
  });

  it("never completes a request while the target keeps failing", () => {
    for (const frame of frames) near(frame.totals.goodput, 0);
  });
});

describe("a breaker that recovers", () => {
  // The service heals at tick 20, while the breaker is still open.
  const frames = run((tick) => service(tick >= 20 ? 0 : 1, TRIPPING), 45);
  const edge = (tick: number) => frames[tick - 1].edges["client-service"];

  it("fails fast while open even though the target is healthy again", () => {
    for (const tick of [5, 20, 24]) {
      expect(edge(tick).breaker).toBe("open");
      near(frames[tick - 1].totals.goodput, 0);
    }
  });

  it("completes only the probe share while half-open", () => {
    for (const tick of [25, 30, 34]) {
      expect(edge(tick).breaker).toBe("half-open");
      near(frames[tick - 1].totals.goodput, 10);
    }
  });

  it("closes after successful probes and restores full flow", () => {
    for (const tick of [35, 40, 45]) {
      expect(edge(tick).breaker).toBe("closed");
      near(edge(tick).flow, 100);
      near(edge(tick).blocked, 0);
      near(frames[tick - 1].totals.goodput, 100);
    }
  });
});

describe("a breaker below its threshold", () => {
  it("never trips", () => {
    const frames = run(() => service(0.3, TRIPPING), 100);

    for (const frame of frames) {
      expect(frame.edges["client-service"].breaker).toBe("closed");
      near(frame.edges["client-service"].flow, 100);
    }
    near(frames[99].totals.goodput, 70);
  });
});

describe("breakers that are not configured", () => {
  it("are off by default", () => {
    const frames = run(() => service(1), 30);

    for (const frame of frames) {
      expect(frame.edges["client-service"].breaker).toBe("off");
      near(frame.edges["client-service"].flow, 100);
      near(frame.totals.shortCircuited, 0);
    }
  });

  it("are ignored on an async edge", () => {
    const frames = run(() => service(1, { ...TRIPPING, mode: "async" }), 30);

    for (const frame of frames) {
      expect(frame.edges["client-service"].breaker).toBe("off");
      near(frame.edges["client-service"].flow, 100);
    }
  });
});

describe("a breaker protecting a shared target", () => {
  // Both clients send 100 req/s to a database that serves 100 req/s, so it
  // drops half of everything until the breaker on the first edge trips.
  const shared: GraphInput = {
    nodes: [
      { id: "a", preset: "client", overrides: { rps: 100 } },
      { id: "b", preset: "client", overrides: { rps: 100 } },
      {
        id: "db",
        preset: "database",
        overrides: { capacity: 100, buffer: 0 },
      },
    ],
    edges: [
      {
        id: "a-db",
        source: "a",
        target: "db",
        mode: "sync",
        breakerThreshold: 0.4,
        breakerCooldownMs: 2000,
      },
      { id: "b-db", source: "b", target: "db", mode: "sync" },
    ],
  };
  const frames = run(() => shared, 12);

  it("sheds half of the load from the target when it trips", () => {
    near(frames[7].nodes.db.offered, 200);
    expect(frames[7].edges["a-db"].breaker).toBe("closed");

    near(frames[8].nodes.db.offered, 100);
    near(frames[8].nodes.db.dropped, 0);
    expect(frames[8].edges["a-db"].breaker).toBe("open");
    near(frames[8].edges["a-db"].blocked, 100);
  });

  it("lets the other caller through untouched", () => {
    near(frames[8].edges["b-db"].flow, 100);
    near(frames[8].edges["b-db"].failed, 0);
    near(frames[8].totals.goodput, 100);
  });
});
