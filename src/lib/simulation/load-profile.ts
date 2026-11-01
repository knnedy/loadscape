import { DT } from "./step";

export const MAX_LOAD_FACTOR = 100;

const MAX_SECONDS = 3600;
const MIN_DURATION_S = DT;
const TICKS_PER_SECOND = Math.round(1 / DT);

export type LoadProfile =
  | { kind: "constant" }
  | { kind: "spike"; startS: number; durationS: number; factor: number }
  | { kind: "step"; startS: number; factor: number }
  | {
      kind: "ramp";
      startS: number;
      durationS: number;
      from: number;
      to: number;
    };

export const STEADY: LoadProfile = { kind: "constant" };

const toTicks = (seconds: number) => Math.round(seconds * TICKS_PER_SECOND);

// The multiplier on every client's request rate for the tick that starts at
// `tick`. Everything is compared in whole ticks, so a boundary never depends
// on floating point.
export function loadFactorAt(profile: LoadProfile, tick: number): number {
  switch (profile.kind) {
    case "constant":
      return 1;
    case "spike": {
      const start = toTicks(profile.startS);
      const end = start + Math.max(1, toTicks(profile.durationS));
      return tick >= start && tick < end ? profile.factor : 1;
    }
    case "step":
      return tick >= toTicks(profile.startS) ? profile.factor : 1;
    case "ramp": {
      const start = toTicks(profile.startS);
      const length = Math.max(1, toTicks(profile.durationS));
      if (tick <= start) return profile.from;
      if (tick >= start + length) return profile.to;
      return (
        profile.from + ((profile.to - profile.from) * (tick - start)) / length
      );
    }
  }
}

function clamp(
  value: number,
  min: number,
  max: number,
  fallback: number,
): number {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

// Keeps whatever the UI hands over inside ranges the engine can run.
export function normalizeProfile(profile: LoadProfile): LoadProfile {
  const time = (value: number) => clamp(value, 0, MAX_SECONDS, 0);
  const duration = (value: number) =>
    clamp(value, MIN_DURATION_S, MAX_SECONDS, 1);
  const factor = (value: number) => clamp(value, 0, MAX_LOAD_FACTOR, 1);

  switch (profile.kind) {
    case "constant":
      return profile;
    case "spike":
      return {
        kind: "spike",
        startS: time(profile.startS),
        durationS: duration(profile.durationS),
        factor: factor(profile.factor),
      };
    case "step":
      return {
        kind: "step",
        startS: time(profile.startS),
        factor: factor(profile.factor),
      };
    case "ramp":
      return {
        kind: "ramp",
        startS: time(profile.startS),
        durationS: duration(profile.durationS),
        from: factor(profile.from),
        to: factor(profile.to),
      };
  }
}

// A profile is written with its start relative to now. This turns that into
// the absolute simulated time the engine uses.
export function startingIn(profile: LoadProfile, nowS: number): LoadProfile {
  if (profile.kind === "constant") return profile;
  return { ...profile, startS: profile.startS + nowS };
}

const factorText = (value: number) => `${Math.round(value * 100) / 100}×`;

export function profileLabel(profile: LoadProfile): string {
  switch (profile.kind) {
    case "constant":
      return "steady";
    case "spike":
      return `${factorText(profile.factor)} spike`;
    case "step":
      return `${factorText(profile.factor)} surge`;
    case "ramp":
      return `${factorText(profile.from)}→${factorText(profile.to)} ramp`;
  }
}

// The highest multiplier the profile reaches, never below the steady 1×.
export function peakFactor(profile: LoadProfile): number {
  switch (profile.kind) {
    case "constant":
      return 1;
    case "spike":
    case "step":
      return Math.max(1, profile.factor);
    case "ramp":
      return Math.max(profile.from, profile.to);
  }
}
