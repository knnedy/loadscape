import { describe, expect, it } from "vitest";
import { resolveGraph, type GraphInput } from "@/lib/simulation/presets";
import {
  RUN_LENGTH_SECONDS,
  TICKS_PER_SECOND,
  createSimulationStore,
} from "./simulation-store";

function chain(apiCapacity = 100, withDb = false): GraphInput {
  const input: GraphInput = {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 80 } },
      { id: "api", preset: "compute", overrides: { capacity: apiCapacity } },
    ],
    edges: [
      { id: "client-api", source: "client", target: "api", mode: "sync" },
    ],
  };
  if (withDb) {
    input.nodes.push({ id: "db", preset: "database" });
    input.edges.push({
      id: "api-db",
      source: "api",
      target: "db",
      mode: "sync",
    });
  }
  return input;
}

const cycle: GraphInput = {
  nodes: [
    { id: "client", preset: "client" },
    { id: "a", preset: "compute" },
    { id: "b", preset: "compute" },
  ],
  edges: [
    { id: "client-a", source: "client", target: "a", mode: "sync" },
    { id: "a-b", source: "a", target: "b", mode: "sync" },
    { id: "b-a", source: "b", target: "a", mode: "sync" },
  ],
};

function started(input: GraphInput = chain()) {
  const store = createSimulationStore();
  store.getState().configure(resolveGraph(input));
  return store;
}

describe("run store", () => {
  it("is idle at time zero once a runnable diagram is configured", () => {
    const { status, order, frame, history } = started().getState();

    expect(status).toBe("idle");
    expect(order).not.toBeNull();
    expect(frame).toBeNull();
    expect(history).toEqual([]);
  });

  it("records one history frame per simulated second", () => {
    const store = started();
    store.getState().play();
    store.getState().advance(25);
    const { status, frame, history } = store.getState();

    expect(status).toBe("running");
    expect(frame?.t).toBeCloseTo(2.5, 9);
    expect(history.map((f) => Math.round(f.t))).toEqual([1, 2]);
  });

  it("finishes at the run length and ignores further ticks", () => {
    const store = started();
    store.getState().play();
    store.getState().advance(RUN_LENGTH_SECONDS * TICKS_PER_SECOND + 50);
    const { status, frame, history } = store.getState();

    expect(status).toBe("finished");
    expect(frame?.t).toBeCloseTo(RUN_LENGTH_SECONDS, 6);
    expect(history).toHaveLength(RUN_LENGTH_SECONDS);
  });

  it("starts again from zero when played after finishing", () => {
    const store = started();
    store.getState().play();
    store.getState().advance(RUN_LENGTH_SECONDS * TICKS_PER_SECOND);
    store.getState().play();
    const { status, frame, history } = store.getState();

    expect(status).toBe("running");
    expect(frame).toBeNull();
    expect(history).toEqual([]);
  });

  it("applies a parameter change on the next tick without resetting time", () => {
    const store = started(chain(100));
    store.getState().play();
    store.getState().advance(10);
    expect(store.getState().frame?.totals.goodput).toBeCloseTo(80, 9);

    store.getState().configure(resolveGraph(chain(40)));
    store.getState().advance(1);
    const { frame, history } = store.getState();

    expect(frame?.t).toBeCloseTo(1.1, 9);
    expect(frame?.totals.goodput).toBeCloseTo(40, 9);
    expect(history).toHaveLength(1);
  });

  it("restarts at zero but keeps running when the structure changes", () => {
    const store = started();
    store.getState().play();
    store.getState().advance(15);

    store.getState().configure(resolveGraph(chain(100, true)));
    const { status, frame, history, sim } = store.getState();

    expect(status).toBe("running");
    expect(frame).toBeNull();
    expect(history).toEqual([]);
    expect(sim.tick).toBe(0);
  });

  it("goes idle and refuses to play when the diagram has a cycle", () => {
    const store = started();
    store.getState().play();
    store.getState().configure(resolveGraph(cycle));
    expect(store.getState().status).toBe("idle");
    expect(store.getState().order).toBeNull();

    store.getState().play();
    expect(store.getState().status).toBe("idle");
  });

  it("steps one tick at a time and pauses a running run", () => {
    const store = started();
    store.getState().play();
    store.getState().stepOnce();
    const { status, frame, sim } = store.getState();

    expect(status).toBe("paused");
    expect(frame?.t).toBeCloseTo(0.1, 9);
    expect(sim.tick).toBe(1);
  });

  it("resets to idle at time zero", () => {
    const store = started();
    store.getState().play();
    store.getState().advance(30);
    store.getState().reset();
    const { status, frame, history, sim } = store.getState();

    expect(status).toBe("idle");
    expect(frame).toBeNull();
    expect(history).toEqual([]);
    expect(sim.tick).toBe(0);
  });
});
