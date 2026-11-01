import { describe, expect, it } from "vitest";
import { STEADY, loadFactorAt, normalizeProfile } from "./load-profile";

describe("loadFactorAt", () => {
  it("is 1 for a steady profile", () => {
    expect(loadFactorAt(STEADY, 0)).toBe(1);
    expect(loadFactorAt(STEADY, 5000)).toBe(1);
  });

  it("applies a spike only inside its window", () => {
    const spike = {
      kind: "spike",
      startS: 10,
      durationS: 5,
      factor: 4,
    } as const;

    expect(loadFactorAt(spike, 99)).toBe(1);
    expect(loadFactorAt(spike, 100)).toBe(4);
    expect(loadFactorAt(spike, 149)).toBe(4);
    expect(loadFactorAt(spike, 150)).toBe(1);
  });

  it("lasts at least one tick however short the window", () => {
    const spike = {
      kind: "spike",
      startS: 1,
      durationS: 0.01,
      factor: 3,
    } as const;

    expect(loadFactorAt(spike, 9)).toBe(1);
    expect(loadFactorAt(spike, 10)).toBe(3);
    expect(loadFactorAt(spike, 11)).toBe(1);
  });

  it("can drop demand to zero", () => {
    const outage = {
      kind: "spike",
      startS: 2,
      durationS: 3,
      factor: 0,
    } as const;

    expect(loadFactorAt(outage, 20)).toBe(0);
    expect(loadFactorAt(outage, 50)).toBe(1);
  });

  it("holds a step from its start onward", () => {
    const step = { kind: "step", startS: 30, factor: 3 } as const;

    expect(loadFactorAt(step, 299)).toBe(1);
    expect(loadFactorAt(step, 300)).toBe(3);
    expect(loadFactorAt(step, 5000)).toBe(3);
  });

  it("moves a ramp linearly between its two levels", () => {
    const ramp = {
      kind: "ramp",
      startS: 10,
      durationS: 10,
      from: 1,
      to: 5,
    } as const;

    expect(loadFactorAt(ramp, 0)).toBe(1);
    expect(loadFactorAt(ramp, 100)).toBe(1);
    expect(loadFactorAt(ramp, 150)).toBe(3);
    expect(loadFactorAt(ramp, 200)).toBe(5);
    expect(loadFactorAt(ramp, 500)).toBe(5);
  });

  it("ramps down as well as up", () => {
    const ramp = {
      kind: "ramp",
      startS: 0,
      durationS: 10,
      from: 5,
      to: 1,
    } as const;

    expect(loadFactorAt(ramp, 0)).toBe(5);
    expect(loadFactorAt(ramp, 50)).toBe(3);
    expect(loadFactorAt(ramp, 100)).toBe(1);
  });

  it("compares in whole ticks, so fractional seconds land exactly", () => {
    const step = { kind: "step", startS: 0.3, factor: 2 } as const;

    expect(loadFactorAt(step, 2)).toBe(1);
    expect(loadFactorAt(step, 3)).toBe(2);
  });
});

describe("normalizeProfile", () => {
  it("leaves a steady profile alone", () => {
    expect(normalizeProfile(STEADY)).toEqual(STEADY);
  });

  it("clamps a spike into range", () => {
    expect(
      normalizeProfile({
        kind: "spike",
        startS: -5,
        durationS: 0,
        factor: 1000,
      }),
    ).toEqual({ kind: "spike", startS: 0, durationS: 0.1, factor: 100 });
  });

  it("replaces values that are not numbers", () => {
    expect(
      normalizeProfile({
        kind: "spike",
        startS: Number.NaN,
        durationS: Number.NaN,
        factor: Number.NaN,
      }),
    ).toEqual({ kind: "spike", startS: 0, durationS: 1, factor: 1 });
  });

  it("clamps both ends of a ramp and the multiplier of a step", () => {
    expect(
      normalizeProfile({
        kind: "ramp",
        startS: 1,
        durationS: 4,
        from: -2,
        to: 500,
      }),
    ).toEqual({ kind: "ramp", startS: 1, durationS: 4, from: 0, to: 100 });
    expect(normalizeProfile({ kind: "step", startS: 2, factor: -1 })).toEqual({
      kind: "step",
      startS: 2,
      factor: 0,
    });
  });
});
