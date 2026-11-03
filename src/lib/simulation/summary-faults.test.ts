import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, step } from "./step";
import { summarizeRun } from "./summary";
import type { EdgeMode, Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 6);

function summarize(
  input: GraphInput,
  seconds: number,
  down: (tick: number) => string[],
) {
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  const history: Frame[] = [];
  for (let i = 0; i < seconds * 10; i++) {
    const result = step(graph, ordered.order, state, 1, new Set(down(i + 1)));
    state = result.state;
    if (state.tick % 10 === 0) history.push(result.frame);
  }

  const summary = summarizeRun(history, graph);
  if (!summary) throw new Error("No summary.");
  return summary;
}

function nodeOf(summary: ReturnType<typeof summarize>, id: string) {
  const node = summary.nodes.find((n) => n.id === id);
  if (!node) throw new Error(`No node ${id}.`);
  return node;
}

// Client at 80 req/s into an API, which calls a database.
function chain(callMode: EdgeMode = "sync"): GraphInput {
  const call: EdgeInput = {
    id: "api-db",
    source: "api",
    target: "db",
    mode: callMode,
  };
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 80 } },
      { id: "api", preset: "compute", overrides: { capacity: 100 } },
      { id: "db", preset: "database", overrides: { capacity: 200 } },
    ],
    edges: [
      { id: "client-api", source: "client", target: "api", mode: "sync" },
      call,
    ],
  };
}

// The database is down for ticks 101 to 300, so the samples at 11 s to 30 s
// (ticks 110 to 300) see it down: twenty of them.
const dbDown = (tick: number) => (tick >= 101 && tick <= 300 ? ["db"] : []);

describe("summarizeRun with a killed database behind a sync call", () => {
  const summary = summarize(chain(), 60, dbDown);

  it("counts the refused requests as drops that failed callers", () => {
    near(summary.generated, 4800);
    near(summary.succeeded, 3200);
    near(summary.successRate, 2 / 3);
    near(summary.unavailable, 1600);
    near(summary.dropped, 1600);
    near(summary.lost, 0);
    expect(summary.firstFailureAt).toBe(11);
  });

  it("times the outage", () => {
    const db = nodeOf(summary, "db");

    expect(db.downSeconds).toBe(20);
    expect(db.firstDownAt).toBe(11);
    near(db.unavailable, 1600);
    near(db.refused, 1600);
    expect(db.firstRefusedAt).toBe(11);
  });

  it("leaves the caller and the client out of it", () => {
    for (const id of ["api", "client"]) {
      const node = nodeOf(summary, id);

      expect(node.downSeconds).toBe(0);
      expect(node.firstDownAt).toBeNull();
      near(node.unavailable, 0);
    }
  });

  it("names the killed node as the bottleneck", () => {
    expect(summary.bottleneck).toEqual({ id: "db", kind: "refusing" });
  });
});

describe("summarizeRun with a killed database behind an async call", () => {
  const summary = summarize(chain("async"), 60, dbDown);

  it("reports the outage as silent loss and leaves callers untouched", () => {
    near(summary.unavailable, 1600);
    near(summary.lost, 1600);
    near(summary.dropped, 0);
    near(summary.successRate, 1);
    expect(summary.firstFailureAt).toBeNull();
    expect(nodeOf(summary, "db").downSeconds).toBe(20);
  });
});

describe("summarizeRun with two outages that overlap", () => {
  // The API is down for ticks 101 to 200 and the database for ticks 101 to
  // 300. While the API is down it sends the database nothing, so the
  // database only refuses requests from tick 201.
  const summary = summarize(chain(), 60, (tick) => [
    ...(tick >= 101 && tick <= 200 ? ["api"] : []),
    ...(tick >= 101 && tick <= 300 ? ["db"] : []),
  ]);

  it("times each node's own outage", () => {
    expect(nodeOf(summary, "api").downSeconds).toBe(10);
    expect(nodeOf(summary, "db").downSeconds).toBe(20);
    expect(nodeOf(summary, "api").firstDownAt).toBe(11);
    expect(nodeOf(summary, "db").firstDownAt).toBe(11);
  });

  it("counts only what each node actually refused", () => {
    near(nodeOf(summary, "api").unavailable, 800);
    near(nodeOf(summary, "db").unavailable, 800);
    near(summary.unavailable, 1600);
  });

  it("fails every request while either node is down", () => {
    near(summary.succeeded, 3200);
    near(summary.successRate, 2 / 3);
  });
});

describe("summarizeRun when nothing is killed", () => {
  const summary = summarize(chain(), 30, () => []);

  it("reports no outages", () => {
    near(summary.unavailable, 0);
    for (const node of summary.nodes) {
      expect(node.downSeconds).toBe(0);
      expect(node.firstDownAt).toBeNull();
      near(node.unavailable, 0);
    }
    near(summary.successRate, 1);
  });
});

describe("summarizeRun when a client is killed", () => {
  it("ignores it", () => {
    const summary = summarize(chain(), 30, () => ["client"]);

    expect(nodeOf(summary, "client").downSeconds).toBe(0);
    near(summary.unavailable, 0);
    near(summary.successRate, 1);
  });
});
