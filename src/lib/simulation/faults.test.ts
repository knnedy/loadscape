import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { createState, step } from "./step";
import type { EdgeMode, Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

function run(
  input: GraphInput,
  ticks: number,
  down: (tick: number) => string[] = () => [],
): Frame[] {
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  const frames: Frame[] = [];
  for (let i = 0; i < ticks; i++) {
    const result = step(graph, ordered.order, state, 1, new Set(down(i + 1)));
    state = result.state;
    frames.push(result.frame);
  }
  return frames;
}

function edge(
  source: string,
  target: string,
  extra: Partial<EdgeInput> = {},
): EdgeInput {
  return { id: `${source}-${target}`, source, target, mode: "sync", ...extra };
}

// Client at 80 req/s into an API, which calls a database.
function chain(callMode: EdgeMode = "sync", call: Partial<EdgeInput> = {}) {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 80 } },
      { id: "api", preset: "compute", overrides: { capacity: 100 } },
      { id: "db", preset: "database", overrides: { capacity: 200 } },
    ],
    edges: [
      edge("client", "api"),
      edge("api", "db", { mode: callMode, ...call }),
    ],
  } satisfies GraphInput;
}

describe("a killed database behind a sync call", () => {
  const frames = run(chain(), 20, () => ["db"]);
  const last = frames[19];

  it("refuses everything it is offered and does no work", () => {
    const { db } = last.nodes;

    expect(db.down).toBe(true);
    near(db.offered, 80);
    near(db.admitted, 0);
    near(db.served, 0);
    near(db.dropped, 80);
    near(db.unavailable, 80);
    near(db.utilization, 0);
  });

  it("fails every request and marks where the failure starts", () => {
    near(last.totals.goodput, 0);
    near(last.totals.dropped, 80);
    near(last.totals.lost, 0);

    near(last.edges["api-db"].flow, 80);
    near(last.edges["api-db"].rejected, 80);
    near(last.edges["api-db"].failed, 80);
    near(last.edges["client-api"].rejected, 0);
    near(last.edges["client-api"].failed, 80);
  });

  it("leaves the caller working, so its effort is wasted", () => {
    near(last.nodes.api.utilization, 0.8);
    near(last.nodes.api.served, 80);
    expect(last.nodes.api.down).toBe(false);
  });
});

describe("a killed database behind an async call", () => {
  it("is silent loss and leaves goodput alone", () => {
    const frames = run(chain("async"), 20, () => ["db"]);
    const last = frames[19];

    near(last.totals.goodput, 80);
    near(last.totals.lost, 80);
    near(last.totals.dropped, 0);
    near(last.nodes.db.unavailable, 80);
  });
});

describe("a killed node in the middle of a chain", () => {
  const frames = run(chain(), 20, () => ["api"]);
  const last = frames[19];

  it("starves everything downstream", () => {
    near(last.nodes.api.offered, 80);
    near(last.nodes.api.unavailable, 80);
    near(last.nodes.api.served, 0);

    near(last.nodes.db.offered, 0);
    near(last.nodes.db.served, 0);
    near(last.edges["api-db"].flow, 0);
    near(last.totals.goodput, 0);
  });
});

describe("a killed queue", () => {
  // 80 req/s into a queue that drains 40 req/s: it gains 4 a tick. The queue
  // is killed for ticks 101 to 110.
  const frames = run(
    {
      nodes: [
        { id: "client", preset: "client", overrides: { rps: 80 } },
        {
          id: "queue",
          preset: "queue",
          overrides: { capacity: 40, buffer: 6000 },
        },
      ],
      edges: [edge("client", "queue")],
    },
    120,
    (tick) => (tick >= 101 && tick <= 110 ? ["queue"] : []),
  );

  it("keeps what it holds but accepts and delivers nothing", () => {
    near(frames[99].nodes.queue.queue, 400);

    for (const tick of [101, 105, 110]) {
      const { queue } = frames[tick - 1].nodes;
      expect(queue.down).toBe(true);
      near(queue.queue, 400);
      near(queue.served, 0);
      near(queue.admitted, 0);
      near(queue.unavailable, 80);
      near(frames[tick - 1].totals.goodput, 0);
    }
  });

  it("resumes draining from where it left off once revived", () => {
    const { queue } = frames[110].nodes;

    expect(queue.down).toBe(false);
    near(queue.served, 40);
    near(queue.queue, 404);
    near(frames[110].totals.goodput, 80);
  });
});

describe("killing a client", () => {
  it("has no effect", () => {
    const frames = run(chain(), 20, () => ["client"]);

    expect(frames[19].nodes.client.down).toBe(false);
    near(frames[19].totals.generated, 80);
    near(frames[19].totals.goodput, 80);
  });
});

describe("a breaker in front of a dead dependency", () => {
  const frames = run(
    chain("sync", { breakerThreshold: 0.5, breakerCooldownMs: 2000 }),
    20,
    () => ["db"],
  );

  it("trips on the failures and stops loading the dead node", () => {
    expect(frames[3].edges["api-db"].breaker).toBe("closed");
    near(frames[3].nodes.db.offered, 80);

    expect(frames[4].edges["api-db"].breaker).toBe("open");
    near(frames[4].edges["api-db"].flow, 0);
    near(frames[4].edges["api-db"].blocked, 80);
    near(frames[4].nodes.db.offered, 0);
  });

  it("keeps the caller doing its work meanwhile", () => {
    near(frames[4].nodes.api.served, 80);
    near(frames[4].totals.goodput, 0);
  });
});

describe("reviving a killed node", () => {
  // The database is down for ticks 11 to 30.
  const frames = run(chain(), 40, (tick) =>
    tick >= 11 && tick <= 30 ? ["db"] : [],
  );

  it("fails requests only while it is down", () => {
    near(frames[9].totals.goodput, 80);
    near(frames[10].totals.goodput, 0);
    near(frames[29].totals.goodput, 0);
    near(frames[30].totals.goodput, 80);
  });

  it("serves normally again straight away", () => {
    const { db } = frames[30].nodes;

    expect(db.down).toBe(false);
    near(db.admitted, 80);
    near(db.served, 80);
    near(db.unavailable, 0);
  });
});

describe("a killed caller", () => {
  // The database always errors, so the API's retries keep coming. The API is
  // killed for ticks 21 to 30.
  const frames = run(
    {
      nodes: [
        { id: "client", preset: "client", overrides: { rps: 80 } },
        { id: "api", preset: "compute", overrides: { capacity: 100 } },
        { id: "db", preset: "external", overrides: { failRate: 1 } },
      ],
      edges: [
        edge("client", "api"),
        edge("api", "db", { retries: 2, backoffMs: 100 }),
      ],
    },
    40,
    (tick) => (tick >= 21 && tick <= 30 ? ["api"] : []),
  );
  const retry = (tick: number) => frames[tick - 1].edges["api-db"].retry;

  it("retries steadily before it is killed", () => {
    near(retry(20), 160);
    near(frames[19].edges["api-db"].flow, 240);
  });

  it("loses the retries it was holding", () => {
    for (const tick of [21, 25, 30]) {
      near(retry(tick), 0);
      near(frames[tick - 1].edges["api-db"].flow, 0);
    }
    near(retry(31), 0);
  });

  it("starts retrying from scratch once revived", () => {
    near(retry(32), 80);
  });
});
