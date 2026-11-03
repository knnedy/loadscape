import { describe, expect, it } from "vitest";
import { resolveGraph, type GraphInput } from "@/lib/simulation/presets";
import { createSimulationStore } from "./simulation-store";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

// Client at 80 req/s into an API, which calls a database.
function chain(): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 80 } },
      { id: "api", preset: "compute", overrides: { capacity: 100 } },
      { id: "db", preset: "database", overrides: { capacity: 200 } },
    ],
    edges: [
      { id: "client-api", source: "client", target: "api", mode: "sync" },
      { id: "api-db", source: "api", target: "db", mode: "sync" },
    ],
  };
}

function configured() {
  const store = createSimulationStore();
  store.getState().configure(resolveGraph(chain()));
  return store;
}

function started() {
  const store = configured();
  store.getState().play();
  return store;
}

describe("run store faults", () => {
  it("applies a kill from the next tick and a revive the same way", () => {
    const store = started();
    store.getState().advance(5);
    near(store.getState().frame?.totals.goodput ?? -1, 80);

    store.getState().kill("db");
    store.getState().advance(1);
    expect(store.getState().frame?.nodes.db.down).toBe(true);
    near(store.getState().frame?.totals.goodput ?? -1, 0);
    expect(store.getState().sim.tick).toBe(6);

    store.getState().revive("db");
    store.getState().advance(1);
    expect(store.getState().frame?.nodes.db.down).toBe(false);
    near(store.getState().frame?.totals.goodput ?? -1, 80);
  });

  it("can start a run with a node already down", () => {
    const store = configured();
    store.getState().kill("db");
    store.getState().play();
    store.getState().advance(1);

    expect(store.getState().frame?.nodes.db.down).toBe(true);
    near(store.getState().frame?.nodes.db.unavailable ?? -1, 80);
  });

  it("ignores clients, unknown ids and kills before a graph exists", () => {
    const store = configured();
    store.getState().kill("client");
    store.getState().kill("ghost");
    expect(store.getState().down.size).toBe(0);

    const empty = createSimulationStore();
    empty.getState().kill("db");
    expect(empty.getState().down.size).toBe(0);
  });

  it("changes nothing when asked for what is already true", () => {
    const store = configured();
    store.getState().kill("db");
    const killed = store.getState().down;

    store.getState().kill("db");
    expect(store.getState().down).toBe(killed);

    store.getState().revive("api");
    expect(store.getState().down).toBe(killed);

    store.getState().reviveAll();
    const cleared = store.getState().down;
    store.getState().reviveAll();
    expect(store.getState().down).toBe(cleared);
  });

  it("toggles, and revives everything at once", () => {
    const store = configured();

    store.getState().toggleDown("db");
    expect([...store.getState().down]).toEqual(["db"]);

    store.getState().toggleDown("api");
    expect(store.getState().down.size).toBe(2);

    store.getState().toggleDown("db");
    expect([...store.getState().down]).toEqual(["api"]);

    store.getState().reviveAll();
    expect(store.getState().down.size).toBe(0);
  });

  it("survives a reset and a restart", () => {
    const store = started();
    store.getState().kill("db");
    store.getState().advance(5);

    store.getState().reset();
    expect(store.getState().down.has("db")).toBe(true);
    expect(store.getState().sim.tick).toBe(0);

    store.getState().play();
    store.getState().advance(1);
    expect(store.getState().frame?.nodes.db.down).toBe(true);
  });

  it("survives a structural change as long as the node still exists", () => {
    const store = started();
    store.getState().kill("db");
    store.getState().advance(5);

    store.getState().configure(
      resolveGraph({
        ...chain(),
        nodes: [...chain().nodes, { id: "extra", preset: "compute" }],
      }),
    );

    expect(store.getState().down.has("db")).toBe(true);
    expect(store.getState().sim.tick).toBe(0);
  });

  it("drops the fault of a deleted node, so a re-added one starts alive", () => {
    const store = configured();
    store.getState().kill("db");

    store.getState().configure(
      resolveGraph({
        nodes: chain().nodes.filter((node) => node.id !== "db"),
        edges: chain().edges.filter((edge) => edge.id !== "api-db"),
      }),
    );
    expect(store.getState().down.size).toBe(0);

    store.getState().configure(resolveGraph(chain()));
    expect(store.getState().down.has("db")).toBe(false);
  });
});
