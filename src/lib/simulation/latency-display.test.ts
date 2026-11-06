import { describe, expect, it } from "vitest";
import { estimateLatency, exponential } from "./latency-estimate";
import {
  estimateNodeLatency,
  formatLatency,
  latencyTitle,
} from "./latency-display";

describe("formatLatency", () => {
  const cases: [number, string][] = [
    [0, "0ms"],
    [-5, "0ms"],
    [0.4, "<1ms"],
    [1, "1.0ms"],
    [8.333, "8.3ms"],
    [9.96, "10ms"],
    [69.3, "69ms"],
    [460.517, "461ms"],
    [999.6, "1.0s"],
    [1234, "1.2s"],
    [4600, "4.6s"],
    [9960, "10s"],
    [12_345, "12s"],
    [59_600, "1m"],
    [90_000, "1.5m"],
  ];

  it.each(cases)("formats %s ms as %s", (ms, text) => {
    expect(formatLatency(ms)).toBe(text);
  });

  it("shows a dash for values that are not finite", () => {
    expect(formatLatency(Number.NaN)).toBe("–");
    expect(formatLatency(Infinity)).toBe("–");
  });
});

describe("estimateNodeLatency", () => {
  it("has nothing to estimate without latency", () => {
    expect(
      estimateNodeLatency({ latencyMs: 0, latencyVariance: 0 }),
    ).toBeNull();
    expect(
      estimateNodeLatency({ latencyMs: -3, latencyVariance: 1 }),
    ).toBeNull();
    expect(
      estimateNodeLatency({ latencyMs: Number.NaN, latencyVariance: 1 }),
    ).toBeNull();
  });

  it("estimates an exponential from its mean and variance", () => {
    const estimate = estimateNodeLatency({
      latencyMs: 100,
      latencyVariance: 10_000,
    });

    expect(estimate).toEqual(estimateLatency(exponential(100)));
    expect(estimate?.p50).toBeCloseTo(69.3147, 2);
  });

  it("treats a variance that is negative or not a number as none", () => {
    for (const latencyVariance of [-3, Number.NaN]) {
      const estimate = estimateNodeLatency({ latencyMs: 50, latencyVariance });

      expect(estimate).toEqual({ p50: 50, p95: 50, p99: 50 });
    }
  });
});

describe("latencyTitle", () => {
  it("lists the percentiles and says it is an estimate", () => {
    const title = latencyTitle(estimateLatency(exponential(100)));

    expect(title).toContain("p50 69ms");
    expect(title).toContain("p95 300ms");
    expect(title).toContain("p99 461ms");
    expect(title.toLowerCase()).toContain("estimated");
  });
});
