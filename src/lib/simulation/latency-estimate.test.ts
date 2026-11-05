import { describe, expect, it } from "vitest";
import {
  ZERO,
  constant,
  estimateLatency,
  exponential,
  gammaQuantile,
  mixture,
  quantile,
  sum,
  thin,
} from "./latency-estimate";

describe("moments", () => {
  it("makes an exponential's deviation equal its mean", () => {
    expect(exponential(10)).toEqual({ mean: 10, variance: 100 });
    expect(exponential(-5)).toEqual({ mean: 0, variance: 0 });
  });

  it("makes a constant free of variance", () => {
    expect(constant(10)).toEqual({ mean: 10, variance: 0 });
    expect(constant(-1)).toEqual({ mean: 0, variance: 0 });
  });

  it("adds independent steps in series", () => {
    expect(sum({ mean: 1, variance: 1 }, { mean: 2, variance: 4 })).toEqual({
      mean: 3,
      variance: 5,
    });
  });

  it("thins a latency by the chance it happens at all", () => {
    const half = thin(exponential(10), 0.5);

    expect(half.mean).toBeCloseTo(5, 12);
    expect(half.variance).toBeCloseTo(75, 12);
    expect(thin(exponential(10), 1)).toEqual(exponential(10));
    expect(thin(exponential(10), 0)).toEqual({ mean: 0, variance: 0 });
  });

  it("clamps the thinning probability", () => {
    expect(thin(exponential(10), 3)).toEqual(exponential(10));
    expect(thin(exponential(10), -1)).toEqual({ mean: 0, variance: 0 });
  });

  it("mixes paths by weight", () => {
    const even = mixture([
      { weight: 1, moments: constant(10) },
      { weight: 1, moments: constant(20) },
    ]);
    expect(even.mean).toBeCloseTo(15, 12);
    expect(even.variance).toBeCloseTo(25, 12);

    const skewed = mixture([
      { weight: 3, moments: constant(10) },
      { weight: 1, moments: constant(20) },
    ]);
    expect(skewed.mean).toBeCloseTo(12.5, 12);
    expect(skewed.variance).toBeCloseTo(18.75, 12);
  });

  it("keeps the variance of identical paths at zero", () => {
    const same = mixture([
      { weight: 1, moments: constant(10) },
      { weight: 2, moments: constant(10) },
      { weight: 1, moments: constant(10) },
    ]);

    expect(same.mean).toBeCloseTo(10, 12);
    expect(same.variance).toBeCloseTo(0, 9);
    expect(same.variance).toBeGreaterThanOrEqual(0);
  });

  it("mixes nothing into nothing", () => {
    expect(mixture([])).toEqual(ZERO);
    expect(mixture([{ weight: 0, moments: constant(10) }])).toEqual(ZERO);
  });
});

describe("gammaQuantile", () => {
  const cases: [number, number, number, number][] = [
    [1, 0.693147, 2.995732, 4.60517],
    [2, 1.678347, 4.743865, 6.638352],
    [5, 4.670909, 9.153519, 11.604625],
    [0.5, 0.227468, 1.920729, 3.317448],
  ];

  it.each(cases)(
    "matches the published values for a shape of %s",
    (shape, p50, p95, p99) => {
      expect(gammaQuantile(shape, 0.5)).toBeCloseTo(p50, 3);
      expect(gammaQuantile(shape, 0.95)).toBeCloseTo(p95, 3);
      expect(gammaQuantile(shape, 0.99)).toBeCloseTo(p99, 3);
    },
  );

  it("handles the ends of the range", () => {
    expect(gammaQuantile(2, 0)).toBe(0);
    expect(gammaQuantile(2, -1)).toBe(0);
    expect(gammaQuantile(2, 1)).toBe(Infinity);
  });

  it("rises with the probability", () => {
    expect(gammaQuantile(3, 0.5)).toBeLessThan(gammaQuantile(3, 0.95));
    expect(gammaQuantile(3, 0.95)).toBeLessThan(gammaQuantile(3, 0.99));
  });

  it("is close to normal for a large shape", () => {
    const value = gammaQuantile(600, 0.95);

    expect(Math.abs(value - 640.85) / 640.85).toBeLessThan(0.003);
  });

  it("joins up across the switch to the large-shape approximation", () => {
    for (const p of [0.5, 0.95, 0.99]) {
      const below = gammaQuantile(500, p);
      const above = gammaQuantile(500.001, p);

      expect(Math.abs(above / below - 1)).toBeLessThan(1e-3);
    }
  });
});

describe("quantile", () => {
  it("is zero with no latency", () => {
    expect(quantile(ZERO, 0.99)).toBe(0);
  });

  it("returns the value itself when there is no variance", () => {
    expect(quantile(constant(50), 0.5)).toBe(50);
    expect(quantile(constant(50), 0.99)).toBe(50);
  });

  it("scales linearly with the unit of time", () => {
    const small = estimateLatency(exponential(100));
    const large = estimateLatency(exponential(200));

    expect(large.p50).toBeCloseTo(small.p50 * 2, 6);
    expect(large.p95).toBeCloseTo(small.p95 * 2, 6);
    expect(large.p99).toBeCloseTo(small.p99 * 2, 6);
  });
});

describe("estimateLatency", () => {
  it("gives the exponential percentiles for a single node", () => {
    const estimate = estimateLatency(exponential(100));

    expect(estimate.p50).toBeCloseTo(69.3147, 2);
    expect(estimate.p95).toBeCloseTo(299.5732, 2);
    expect(estimate.p99).toBeCloseTo(460.517, 2);
  });

  it("gives the Erlang percentiles for two equal nodes in series", () => {
    const estimate = estimateLatency(sum(exponential(100), exponential(100)));

    expect(estimate.p50).toBeCloseTo(167.8347, 2);
    expect(estimate.p95).toBeCloseTo(474.3865, 2);
    expect(estimate.p99).toBeCloseTo(663.8352, 2);
  });

  it("orders the percentiles", () => {
    const estimate = estimateLatency(
      sum(exponential(20), thin(exponential(80), 0.4)),
    );

    expect(estimate.p50).toBeLessThan(estimate.p95);
    expect(estimate.p95).toBeLessThan(estimate.p99);
  });

  it("puts more latency in the tail when the variance is higher", () => {
    const steady = estimateLatency({ mean: 100, variance: 2500 });
    const bursty = estimateLatency({ mean: 100, variance: 40_000 });

    expect(bursty.p99).toBeGreaterThan(steady.p99);
    expect(bursty.p50).toBeLessThan(steady.p50);
  });

  it("shows a fast path and a slow path as a long tail", () => {
    const estimate = estimateLatency(
      sum(constant(1), thin(exponential(100), 0.2)),
    );

    expect(estimate.p50).toBeLessThan(estimate.p99 / 10);
  });
});
