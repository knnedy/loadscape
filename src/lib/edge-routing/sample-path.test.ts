import { describe, expect, it } from "vitest";
import { pointAt, samplePath } from "./sample-path";

describe("samplePath", () => {
  it("measures a straight line", () => {
    const path = samplePath("M0 0L100 0");

    expect(path.total).toBeCloseTo(100, 9);
    expect(pointAt(path, 50)).toEqual({ x: 50, y: 0 });
  });

  it("follows a corner", () => {
    const path = samplePath("M0 0L100 0L100 100");

    expect(path.total).toBeCloseTo(200, 9);
    const point = pointAt(path, 150);
    expect(point.x).toBeCloseTo(100, 9);
    expect(point.y).toBeCloseTo(50, 9);
  });

  it("flattens a curve and finds its midpoint", () => {
    const path = samplePath("M0 0Q50 0 50 50");

    expect(path.total).toBeGreaterThan(70.7);
    expect(path.total).toBeLessThan(100);
    const middle = pointAt(path, path.total / 2);
    expect(middle.x).toBeCloseTo(37.5, 6);
    expect(middle.y).toBeCloseTo(12.5, 6);
  });

  it("samples a path with rounded corners from start to end", () => {
    const path = samplePath("M0 0L92 0Q100 0 100 8L100 100");

    expect(pointAt(path, 0)).toEqual({ x: 0, y: 0 });
    const end = pointAt(path, path.total);
    expect(end.x).toBeCloseTo(100, 9);
    expect(end.y).toBeCloseTo(100, 9);
  });

  it("clamps a distance before the start or past the end", () => {
    const path = samplePath("M0 0L100 0");

    expect(pointAt(path, -10)).toEqual({ x: 0, y: 0 });
    expect(pointAt(path, 500)).toEqual({ x: 100, y: 0 });
  });

  it("copes with an empty path", () => {
    const path = samplePath("");

    expect(path.total).toBe(0);
    expect(pointAt(path, 10)).toEqual({ x: 0, y: 0 });
  });
});
