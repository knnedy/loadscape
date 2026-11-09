import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type GraphInput } from "./presets";
import { DT, createState, step } from "./step";
import type { Frame, SimState } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

// A client at 80 req/s into a node that serves 40 req/s, so half of what
// arrives has to wait and the line gains 4 requests every tick.
function build(buffer: number, timeoutMs: number): GraphInput {
  return {
    nodes: [
      { id: "client", preset: "client", overrides: { rps: 80 } },
      {
        id: "db",
        preset: "database",
        overrides: { capacity: 40, latencyMs: 5, buffer, timeoutMs },
      },
    ],
    edges: [{ id: "client-db", source: "client", target: "db", mode: "sync" }],
  };
}

// The buffer is a function of the tick being produced, starting at 1, so a
// test can resize it between any two ticks.
function run(
  bufferAt: (tick: number) => number,
  ticks: number,
  timeoutMs: number,
): { frames: Frame[]; state: SimState } {
  const ordered = orderGraph(resolveGraph(build(bufferAt(1), timeoutMs)));
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  const frames: Frame[] = [];
  for (let tick = 1; tick <= ticks; tick++) {
    const graph = resolveGraph(build(bufferAt(tick), timeoutMs));
    const result = step(graph, ordered.order, state, 1);
    state = result.state;
    frames.push(result.frame);
  }
  return { frames, state };
}

// Both ways of keeping a line are covered: a total for a node with no
// timeout, and batches by arrival time for one with a timeout.
const PATHS: [string, number][] = [
  ["without a timeout", 0],
  ["with a timeout", 10_000],
];

describe.each(PATHS)(
  "shrinking a buffer below the queue %s",
  (_, timeoutMs) => {
    // 30 ticks at 200 build the line to 120, then the buffer drops to 50.
    const { frames, state } = run(
      (tick) => (tick <= 30 ? 200 : 50),
      34,
      timeoutMs,
    );

    it("holds the full line just before the change", () => {
      near(frames[29].nodes.db.queue, 120);
      near(frames[29].nodes.db.dropped, 0);
    });

    it("evicts what no longer fits and counts it as dropped", () => {
      const { db } = frames[30].nodes;

      // 70 evicted, plus 4 of the 8 arrivals that do not fit either.
      near(db.dropped, 740);
      near(db.queue, 50);
      near(db.offered, 80);
      near(db.admitted, 40);
      near(db.served, 40);
      near(frames[30].totals.dropped, 740);
    });

    it("breaks offered = admitted + dropped by exactly the evicted volume", () => {
      const { db } = frames[30].nodes;
      const evicted = 70;

      near(db.offered * DT + evicted, (db.admitted + db.dropped) * DT);
    });

    it("settles back to ordinary overflow on the next tick", () => {
      for (const index of [31, 32, 33]) {
        const { db } = frames[index].nodes;

        near(db.queue, 50);
        near(db.dropped, 40);
        near(db.admitted, 40);
        near(db.offered * DT, (db.admitted + db.dropped) * DT);
      }
      near(state.queues.db, 50);
    });
  },
);

describe.each(PATHS)("shrinking a buffer to zero %s", (_, timeoutMs) => {
  const { frames } = run((tick) => (tick <= 30 ? 200 : 0), 33, timeoutMs);

  it("evicts the whole line", () => {
    const { db } = frames[30].nodes;

    // 120 evicted, plus 4 of the 8 arrivals, which cannot wait at all.
    near(db.dropped, 1240);
    near(db.queue, 0);
    near(db.admitted, 40);
    near(db.served, 40);
  });

  it("then sheds the excess immediately", () => {
    for (const index of [31, 32]) {
      const { db } = frames[index].nodes;

      near(db.queue, 0);
      near(db.dropped, 40);
      near(db.admitted, 40);
    }
  });
});

describe.each(PATHS)(
  "shrinking a buffer that still fits %s",
  (_, timeoutMs) => {
    const { frames } = run((tick) => (tick <= 30 ? 200 : 150), 32, timeoutMs);

    it("evicts nothing and keeps queueing", () => {
      const { db } = frames[30].nodes;

      near(db.dropped, 0);
      near(db.admitted, 80);
      near(db.queue, 124);
      near(frames[31].nodes.db.queue, 128);
    });
  },
);

describe.each(PATHS)("growing a buffer %s", (_, timeoutMs) => {
  // A buffer of 20 is full from tick 5 and overflows 4 a tick. At tick 11
  // it grows to 200.
  const { frames } = run((tick) => (tick <= 10 ? 20 : 200), 14, timeoutMs);

  it("overflows while it is too small", () => {
    for (const index of [5, 9]) {
      const { db } = frames[index].nodes;

      near(db.queue, 20);
      near(db.dropped, 40);
      near(db.admitted, 40);
    }
  });

  it("stops overflowing and keeps what was already waiting", () => {
    const { db } = frames[10].nodes;

    near(db.dropped, 0);
    near(db.admitted, 80);
    near(db.queue, 24);
    near(frames[11].nodes.db.queue, 28);
  });
});

describe("resizing the buffer on every tick", () => {
  const scenario = fc.record({
    rps: fc.integer({ min: 1, max: 1000 }),
    capacity: fc.integer({ min: 1, max: 500 }),
    timeoutMs: fc.constantFrom(0, 500, 3000),
    buffers: fc.array(fc.integer({ min: 0, max: 400 }), {
      minLength: 20,
      maxLength: 50,
    }),
  });

  const tolerance = (...values: number[]) =>
    1e-6 * Math.max(1, ...values.map(Math.abs));

  function close(actual: number, expected: number) {
    expect(Math.abs(actual - expected)).toBeLessThanOrEqual(
      tolerance(actual, expected),
    );
  }

  it("keeps the line within the buffer and the books balanced", () => {
    fc.assert(
      fc.property(scenario, ({ rps, capacity, timeoutMs, buffers }) => {
        const make = (buffer: number): GraphInput => ({
          nodes: [
            { id: "client", preset: "client", overrides: { rps } },
            {
              id: "db",
              preset: "database",
              overrides: { capacity, buffer, timeoutMs },
            },
          ],
          edges: [
            { id: "client-db", source: "client", target: "db", mode: "sync" },
          ],
        });
        const ordered = orderGraph(resolveGraph(make(buffers[0])));
        if (!ordered.ok) throw new Error(ordered.error);

        let state = createState();
        let before = 0;
        for (const buffer of buffers) {
          const result = step(
            resolveGraph(make(buffer)),
            ordered.order,
            state,
            1,
          );
          state = result.state;
          const db = result.frame.nodes.db;

          // Requests that timed out are gone before anything is evicted.
          const expired = db.timedOut * DT;
          const evicted = Math.max(0, before - expired - buffer);

          expect(db.queue).toBeGreaterThanOrEqual(0);
          expect(db.queue).toBeLessThanOrEqual(buffer + tolerance(buffer));
          close(
            db.queue,
            before - expired - evicted + (db.admitted - db.served) * DT,
          );
          close(db.offered * DT + evicted, (db.admitted + db.dropped) * DT);
          expect(db.dropped * DT).toBeGreaterThanOrEqual(
            evicted - tolerance(evicted),
          );

          before = db.queue;
        }
      }),
      { numRuns: 200 },
    );
  });
});
