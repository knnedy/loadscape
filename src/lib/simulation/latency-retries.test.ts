import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import {
  constant,
  estimateLatency,
  exponential,
  repeat,
  withRetries,
} from "./latency-estimate";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, step } from "./step";
import type { Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

describe("repeat", () => {
  it("does the same independent step several times in a row", () => {
    expect(repeat(exponential(10), 3)).toEqual({ mean: 30, variance: 300 });
    expect(repeat(constant(5), 0)).toEqual({ mean: 0, variance: 0 });
  });
});

describe("withRetries", () => {
  const attempt = exponential(100);

  it("is the attempt itself when there are no retries", () => {
    expect(withRetries(attempt, 0.5, [])).toBe(attempt);
  });

  it("is the attempt itself when nothing ever fails", () => {
    expect(withRetries(attempt, 0, [300, 600])).toEqual(attempt);
  });

  it("treats a failure share that is not a number as no failures", () => {
    expect(withRetries(attempt, Number.NaN, [300])).toEqual(attempt);
  });

  it("uses every retry and waits out every delay when everything fails", () => {
    const result = withRetries(constant(100), 1, [300, 600]);

    near(result.mean, 3 * 100 + 300 + 600);
    near(result.variance, 0);
  });

  it("mixes the number of retries used by how often attempts fail", () => {
    // Half of all attempts fail. With two retries the call takes one attempt
    // half the time, two a quarter of the time and three a quarter of the
    // time, and waits 300 ms and then 600 ms before the extra attempts.
    const result = withRetries(attempt, 0.5, [300, 600]);

    near(result.mean, 0.5 * 100 + 0.25 * 500 + 0.25 * 1200);
    near(result.variance, 445_000 - 475 ** 2);
    near(result.mean, 475);
    near(result.variance, 219_375);
  });

  it("is a single wait for a single retry", () => {
    const result = withRetries(attempt, 0.5, [100]);

    near(result.mean, 200);
    near(result.variance, 25_000);
  });

  it("adds no wait when the delays are zero", () => {
    const result = withRetries(constant(100), 1, [0, 0]);

    near(result.mean, 300);
  });

  it("is slower the more often attempts fail", () => {
    const rare = withRetries(attempt, 0.1, [300, 600]);
    const common = withRetries(attempt, 0.6, [300, 600]);

    expect(common.mean).toBeGreaterThan(rare.mean);
  });

  it("makes a heavier tail than the single attempt", () => {
    const retried = estimateLatency(withRetries(attempt, 0.5, [300, 600]));
    const plain = estimateLatency(attempt);

    expect(retried.p99).toBeGreaterThan(plain.p99);
    expect(retried.p50).toBeGreaterThan(plain.p50);
  });
});

// A client calls a service that always takes 100 ms on average and fails half
// the time whatever the load, so the numbers do not depend on how retries and
// capacity interact.
function flaky(edge: Partial<EdgeInput> = {}): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 100 } },
      {
        id: "service",
        preset: "external",
        overrides: { failRate: 0.5, latencyMs: 100 },
      },
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

function run(input: GraphInput, ticks = 5): Frame {
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

describe("latency of a retried call in the engine", () => {
  it("is unchanged without a retry policy", () => {
    const frame = run(flaky());

    near(frame.nodes.client.latencyMs, 100);
    near(frame.nodes.client.latencyVariance, 10_000);
    near(frame.nodes.service.latencyMs, 100);
  });

  it("adds the attempts and waits a failing call goes through", () => {
    const frame = run(flaky({ retries: 2, backoffMs: 300 }));

    near(frame.nodes.client.latencyMs, 475);
    near(frame.nodes.client.latencyVariance, 219_375);
  });

  it("leaves the service's own latency alone", () => {
    const frame = run(flaky({ retries: 2, backoffMs: 300 }));

    near(frame.nodes.service.latencyMs, 100);
    near(frame.nodes.service.latencyVariance, 10_000);
    near(frame.nodes.service.ownLatencyMs, 100);
  });

  it("uses the whole-tick waits the engine schedules", () => {
    // A 20 ms backoff is one 100 ms tick, so one retry adds 100 ms half the
    // time: 100 plus 0.5 x (100 + 100).
    const frame = run(flaky({ retries: 1, backoffMs: 20 }));

    near(frame.nodes.client.latencyMs, 200);
    near(frame.nodes.client.latencyVariance, 25_000);
  });

  it("ignores a retry policy on an async edge", () => {
    const frame = run(flaky({ retries: 2, backoffMs: 300, mode: "async" }));

    near(frame.nodes.client.latencyMs, 0);
    near(frame.nodes.client.latencyVariance, 0);
  });

  it("settles to the same figure however long the run", () => {
    const early = run(flaky({ retries: 2, backoffMs: 300 }), 1);
    const late = run(flaky({ retries: 2, backoffMs: 300 }), 40);

    near(early.nodes.client.latencyMs, late.nodes.client.latencyMs);
    near(early.nodes.client.latencyVariance, late.nodes.client.latencyVariance);
  });
});
