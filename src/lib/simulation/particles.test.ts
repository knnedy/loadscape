import { describe, expect, it } from "vitest";
import {
  BURST_SECONDS,
  MAX_PARTICLES_PER_EDGE,
  advanceEdgeParticles,
  createEdgeParticles,
  nextKind,
  speedFactor,
  spawnRate,
  type EdgeDrive,
} from "./particles";

const drive = (overrides: Partial<EdgeDrive> = {}): EdgeDrive => ({
  length: 100,
  flow: 0,
  failed: 0,
  rejected: 0,
  queueFill: 0,
  ...overrides,
});

describe("spawnRate", () => {
  it("is zero with no meaningful flow", () => {
    expect(spawnRate(0)).toBe(0);
    expect(spawnRate(0.01)).toBe(0);
    expect(spawnRate(-1)).toBe(0);
    expect(spawnRate(Number.NaN)).toBe(0);
  });

  it("grows with the logarithm of the flow", () => {
    expect(spawnRate(100)).toBeCloseTo(8.013, 2);
    expect(spawnRate(1000)).toBeGreaterThan(spawnRate(100));
  });

  it("is capped at 12 a second", () => {
    expect(spawnRate(1e9)).toBe(12);
  });
});

describe("speedFactor", () => {
  it("is full speed with no queue pressure", () => {
    expect(speedFactor(0, 0)).toBe(1);
    expect(speedFactor(0.5, 0)).toBe(1);
    expect(speedFactor(1, 0)).toBe(1);
  });

  it("only slows the last 60% of the edge", () => {
    expect(speedFactor(0, 1)).toBe(1);
    expect(speedFactor(0.4, 1)).toBe(1);
    expect(speedFactor(1, 1)).toBeCloseTo(0.15, 9);
  });

  it("never speeds up further along the edge", () => {
    let previous = speedFactor(0, 0.8);
    for (let progress = 0.05; progress <= 1; progress += 0.05) {
      const current = speedFactor(progress, 0.8);
      expect(current).toBeLessThanOrEqual(previous);
      previous = current;
    }
  });

  it("clamps the queue fill to 0 to 1", () => {
    expect(speedFactor(1, 5)).toBeCloseTo(0.15, 9);
    expect(speedFactor(1, -2)).toBe(1);
  });
});

describe("nextKind", () => {
  it("matches the engine's shares exactly over a long run", () => {
    const state = { rejectedCarry: 0, downstreamCarry: 0 };
    const counts = { ok: 0, downstream: 0, rejected: 0 };
    for (let i = 0; i < 1000; i++) {
      counts[nextKind(state, 0.4, 0.2)]++;
    }

    expect(Math.abs(counts.rejected - 400)).toBeLessThanOrEqual(1);
    expect(Math.abs(counts.downstream - 200)).toBeLessThanOrEqual(1);
    expect(Math.abs(counts.ok - 400)).toBeLessThanOrEqual(2);
  });

  it("rejects every particle at a share of 1 and none at 0", () => {
    const all = { rejectedCarry: 0, downstreamCarry: 0 };
    const none = { rejectedCarry: 0, downstreamCarry: 0 };
    for (let i = 0; i < 50; i++) {
      expect(nextKind(all, 1, 0)).toBe("rejected");
      expect(nextKind(none, 0, 0)).toBe("ok");
    }
  });
});

describe("advanceEdgeParticles", () => {
  it("spawns nothing without flow", () => {
    const state = createEdgeParticles();
    advanceEdgeParticles(state, drive({ flow: 0 }), 1);

    expect(state.particles).toHaveLength(0);
  });

  it("spawns at the capped rate", () => {
    const state = createEdgeParticles();
    advanceEdgeParticles(state, drive({ length: 1e6, flow: 1e6 }), 1);

    expect(state.particles).toHaveLength(12);
  });

  it("never holds more than the per-edge cap", () => {
    const state = createEdgeParticles();
    advanceEdgeParticles(state, drive({ length: 1e6, flow: 1e6 }), 10);

    expect(state.particles).toHaveLength(MAX_PARTICLES_PER_EDGE);
  });

  it("removes a healthy particle at the end of the edge", () => {
    const state = createEdgeParticles();
    advanceEdgeParticles(state, drive({ flow: 1 }), 0.4);
    expect(state.particles).toHaveLength(1);
    expect(state.particles[0].kind).toBe("ok");

    advanceEdgeParticles(state, drive({ flow: 0 }), 0.5);
    expect(state.particles).toHaveLength(0);
  });

  it("marks a particle that fails downstream and lets it finish", () => {
    const state = createEdgeParticles();
    advanceEdgeParticles(
      state,
      drive({ flow: 1, failed: 1, rejected: 0 }),
      0.4,
    );

    expect(state.particles[0].kind).toBe("downstream");
    advanceEdgeParticles(state, drive({ flow: 0 }), 0.5);
    expect(state.particles).toHaveLength(0);
  });

  it("stops a rejected particle short of the target and bursts it", () => {
    const state = createEdgeParticles();
    advanceEdgeParticles(
      state,
      drive({ flow: 1, failed: 1, rejected: 1 }),
      0.4,
    );
    expect(state.particles[0].kind).toBe("rejected");
    expect(state.particles[0].burst).toBeNull();

    advanceEdgeParticles(state, drive({ flow: 0 }), 0.5);
    expect(state.particles[0].distance).toBe(90);
    expect(state.particles[0].burst).toBe(0);

    advanceEdgeParticles(state, drive({ flow: 0 }), BURST_SECONDS + 0.01);
    expect(state.particles).toHaveLength(0);
  });

  it("moves particles into a full queue less far than into an empty one", () => {
    const travelled = (queueFill: number) => {
      const state = createEdgeParticles();
      state.particles.push({ distance: 900, kind: "ok", burst: null });
      advanceEdgeParticles(state, drive({ length: 1000, queueFill }), 0.2);
      return state.particles[0].distance;
    };

    expect(travelled(0)).toBeCloseTo(928, 6);
    expect(travelled(1)).toBeLessThan(travelled(0));
  });
});
