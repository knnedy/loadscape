import { describe, expect, it } from "vitest";
import {
  STEADY,
  peakFactor,
  profileLabel,
  startingIn,
  type LoadProfile,
} from "./load-profile";

describe("startingIn", () => {
  it("leaves a steady profile alone", () => {
    expect(startingIn(STEADY, 40)).toBe(STEADY);
  });

  it("shifts the start of every other shape by the current time", () => {
    expect(
      startingIn({ kind: "spike", startS: 2, durationS: 5, factor: 4 }, 30),
    ).toEqual({ kind: "spike", startS: 32, durationS: 5, factor: 4 });
    expect(startingIn({ kind: "step", startS: 0, factor: 3 }, 12)).toEqual({
      kind: "step",
      startS: 12,
      factor: 3,
    });
    expect(
      startingIn({ kind: "ramp", startS: 1, durationS: 10, from: 1, to: 5 }, 9),
    ).toEqual({ kind: "ramp", startS: 10, durationS: 10, from: 1, to: 5 });
  });
});

describe("profileLabel", () => {
  it("names each shape with its multiplier", () => {
    expect(profileLabel(STEADY)).toBe("steady");
    expect(
      profileLabel({ kind: "spike", startS: 0, durationS: 1, factor: 4 }),
    ).toBe("4× spike");
    expect(profileLabel({ kind: "step", startS: 0, factor: 3 })).toBe(
      "3× surge",
    );
    expect(
      profileLabel({
        kind: "ramp",
        startS: 0,
        durationS: 1,
        from: 1,
        to: 5,
      }),
    ).toBe("1×→5× ramp");
  });

  it("keeps fractional multipliers short", () => {
    expect(
      profileLabel({ kind: "spike", startS: 0, durationS: 1, factor: 0.5 }),
    ).toBe("0.5× spike");
    expect(profileLabel({ kind: "step", startS: 0, factor: 1.234 })).toBe(
      "1.23× surge",
    );
  });
});

describe("peakFactor", () => {
  const cases: [string, LoadProfile, number][] = [
    ["a steady profile", STEADY, 1],
    [
      "a spike above 1×",
      { kind: "spike", startS: 0, durationS: 1, factor: 4 },
      4,
    ],
    [
      "a spike below 1×, since the rest of the run is steady",
      { kind: "spike", startS: 0, durationS: 1, factor: 0.5 },
      1,
    ],
    ["a surge", { kind: "step", startS: 0, factor: 3 }, 3],
    ["a ramp up", { kind: "ramp", startS: 0, durationS: 1, from: 1, to: 5 }, 5],
    [
      "a ramp down",
      { kind: "ramp", startS: 0, durationS: 1, from: 5, to: 1 },
      5,
    ],
  ];

  it.each(cases)("is correct for %s", (_, profile, expected) => {
    expect(peakFactor(profile)).toBe(expected);
  });
});
