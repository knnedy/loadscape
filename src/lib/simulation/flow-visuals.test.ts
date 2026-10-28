import { describe, expect, it } from "vitest";
import { failureTint, strokeWidthFor } from "./flow-visuals";

describe("strokeWidthFor", () => {
  it("keeps the base width when there is no flow", () => {
    expect(strokeWidthFor(0)).toBe(1.5);
    expect(strokeWidthFor(-5)).toBe(1.5);
    expect(strokeWidthFor(Number.NaN)).toBe(1.5);
  });

  it("widens with each decade of flow", () => {
    expect(strokeWidthFor(100)).toBeCloseTo(3, 1);
    expect(strokeWidthFor(1000)).toBeCloseTo(3.75, 1);
  });

  it("stops widening at 4.5", () => {
    expect(strokeWidthFor(10_000)).toBe(4.5);
    expect(strokeWidthFor(1e9)).toBe(4.5);
  });

  it("never narrows as the flow rises", () => {
    const rates = [0, 1, 10, 100, 1000, 10_000, 1e6];
    for (let i = 1; i < rates.length; i++) {
      expect(strokeWidthFor(rates[i])).toBeGreaterThanOrEqual(
        strokeWidthFor(rates[i - 1]),
      );
    }
  });
});

describe("failureTint", () => {
  it("is zero with no flow or no failures", () => {
    expect(failureTint(0, 0)).toBe(0);
    expect(failureTint(0, 5)).toBe(0);
    expect(failureTint(100, 0)).toBe(0);
  });

  it("ignores a failure share under 2%", () => {
    expect(failureTint(100, 1)).toBe(0);
  });

  it("scales with the failing share", () => {
    expect(failureTint(100, 2)).toBe(3);
    expect(failureTint(100, 50)).toBe(75);
  });

  it("caps at 100", () => {
    expect(failureTint(100, 100)).toBe(100);
    expect(failureTint(100, 200)).toBe(100);
  });
});
