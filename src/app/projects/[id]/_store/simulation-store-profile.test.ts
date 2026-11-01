import { describe, expect, it } from "vitest";
import type { LoadProfile } from "@/lib/simulation/load-profile";
import { resolveGraph, type GraphInput } from "@/lib/simulation/presets";
import { createSimulationStore } from "./simulation-store";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

// 50 req/s into a queue that drains 100 req/s, the S4 setup.
function line(): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 50 } },
      {
        id: "queue",
        preset: "queue",
        overrides: { capacity: 100, buffer: 2000 },
      },
    ],
    edges: [
      { id: "client-queue", source: "client", target: "queue", mode: "sync" },
    ],
  };
}

function started(profile?: LoadProfile) {
  const store = createSimulationStore();
  store.getState().configure(resolveGraph(line()));
  if (profile) store.getState().setProfile(profile);
  store.getState().play();
  return store;
}

describe("run store load profile", () => {
  it("is steady by default", () => {
    const store = started();
    store.getState().advance(30);

    near(store.getState().frame?.totals.generated ?? -1, 50);
    near(store.getState().frame?.nodes.queue.queue ?? -1, 0);
  });

  it("reproduces the spike absorbed by a queue (S4)", () => {
    const store = started({
      kind: "spike",
      startS: 0,
      durationS: 10,
      factor: 4,
    });

    store.getState().advance(100);
    near(store.getState().frame?.totals.generated ?? -1, 200);
    near(store.getState().frame?.nodes.queue.queue ?? -1, 1000);
    near(store.getState().frame?.nodes.queue.lagSeconds ?? -1, 10);

    store.getState().advance(1);
    near(store.getState().frame?.totals.generated ?? -1, 50);

    store.getState().advance(199);
    near(store.getState().frame?.nodes.queue.queue ?? -1, 0);
    near(store.getState().frame?.totals.dropped ?? -1, 0);
  });

  it("applies a change on the next tick without resetting the run", () => {
    const store = started();
    store.getState().advance(20);
    near(store.getState().frame?.totals.generated ?? -1, 50);

    store.getState().setProfile({ kind: "step", startS: 2, factor: 2 });
    store.getState().advance(1);

    near(store.getState().frame?.totals.generated ?? -1, 100);
    expect(store.getState().sim.tick).toBe(21);
    expect(store.getState().history).toHaveLength(2);
  });

  it("keeps the profile through a reset", () => {
    const store = started({
      kind: "spike",
      startS: 0,
      durationS: 10,
      factor: 4,
    });
    store.getState().advance(5);
    store.getState().reset();
    store.getState().play();
    store.getState().advance(1);

    near(store.getState().frame?.totals.generated ?? -1, 200);
  });

  it("keeps the profile through a structural change", () => {
    const store = started({ kind: "step", startS: 0, factor: 3 });
    const before = store.getState().profile;

    store.getState().configure(
      resolveGraph({
        ...line(),
        nodes: [...line().nodes, { id: "extra", preset: "compute" }],
      }),
    );

    expect(store.getState().profile).toBe(before);
    expect(store.getState().sim.tick).toBe(0);
  });

  it("clamps a profile handed over out of range", () => {
    const store = started();
    store.getState().setProfile({
      kind: "spike",
      startS: -1,
      durationS: 0,
      factor: 1000,
    });

    expect(store.getState().profile).toEqual({
      kind: "spike",
      startS: 0,
      durationS: 0.1,
      factor: 100,
    });
  });
});
