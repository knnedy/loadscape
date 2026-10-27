import { describe, expect, it } from "vitest";
import { orderGraph } from "./graph";
import { resolveGraph, type EdgeInput, type GraphInput } from "./presets";
import { DT, createState, step } from "./step";
import type { EdgeMode, Frame } from "./types";

const near = (actual: number, expected: number) =>
  expect(actual).toBeCloseTo(expected, 9);

const last = (frames: Frame[]) => frames[frames.length - 1];

function edge(
  source: string,
  target: string,
  mode: EdgeMode = "sync",
  share?: number,
): EdgeInput {
  return { id: `${source}-${target}`, source, target, mode, share };
}

function run(
  input: GraphInput,
  ticks: number,
  load: (tick: number) => number = () => 1,
): Frame[] {
  const graph = resolveGraph(input);
  const ordered = orderGraph(graph);
  if (!ordered.ok) throw new Error(ordered.error);

  let state = createState();
  const frames: Frame[] = [];
  for (let i = 0; i < ticks; i++) {
    const result = step(graph, ordered.order, state, load(i));
    state = result.state;
    frames.push(result.frame);
  }
  return frames;
}

const droppedVolume = (frames: Frame[]) =>
  frames.reduce((sum, frame) => sum + frame.totals.dropped * DT, 0);

describe("S1 healthy path", () => {
  const frames = run(
    {
      nodes: [
        { id: "client", preset: "client", overrides: { rps: 80 } },
        {
          id: "api",
          preset: "compute",
          overrides: { capacity: 100, latencyMs: 20 },
        },
        {
          id: "db",
          preset: "database",
          overrides: { capacity: 200, latencyMs: 5 },
        },
      ],
      edges: [edge("client", "api"), edge("api", "db")],
    },
    50,
  );

  it("serves everything with no drops", () => {
    const { totals } = last(frames);
    near(totals.goodput, 80);
    near(totals.dropped, 0);
    near(totals.lost, 0);
  });

  it("reports utilization and latency", () => {
    const { nodes } = last(frames);
    near(nodes.api.utilization, 0.8);
    near(nodes.db.latencyMs, 25 / 3);
    near(nodes.api.latencyMs, 100 + 25 / 3);
    near(nodes.client.latencyMs, 100 + 25 / 3);
  });
});

describe("S2 overload without a queue", () => {
  const frames = run(
    {
      nodes: [
        { id: "client", preset: "client", overrides: { rps: 80 } },
        { id: "api", preset: "compute", overrides: { capacity: 100 } },
        {
          id: "db",
          preset: "database",
          overrides: { capacity: 40, buffer: 0 },
        },
      ],
      edges: [edge("client", "api"), edge("api", "db")],
    },
    20,
  );

  it("halves goodput from the first tick", () => {
    near(frames[0].totals.goodput, 40);
    near(last(frames).totals.goodput, 40);
  });

  it("drops the excess at the database", () => {
    const { nodes, totals } = frames[0];
    near(nodes.db.offered, 80);
    near(nodes.db.admitted, 40);
    near(nodes.db.dropped, 40);
    near(totals.dropped, 40);
    near(totals.lost, 0);
  });
});

describe("S3a queue absorbs, then fails", () => {
  const frames = run(
    {
      nodes: [
        { id: "client", preset: "client", overrides: { rps: 80 } },
        { id: "api", preset: "compute", overrides: { capacity: 100 } },
        {
          id: "queue",
          preset: "queue",
          overrides: { capacity: 40, buffer: 6000 },
        },
        { id: "db", preset: "database", overrides: { capacity: 50 } },
      ],
      edges: [edge("client", "api"), edge("api", "queue"), edge("queue", "db")],
    },
    1600,
  );

  it("grows by 40 per second with matching lag", () => {
    near(frames[599].t, 60);
    near(frames[599].nodes.queue.queue, 2400);
    near(frames[599].nodes.queue.lagSeconds, 60);
    near(frames[599].totals.goodput, 80);
  });

  it("holds goodput until the queue is full at 150 s", () => {
    near(frames[1499].t, 150);
    near(frames[1499].nodes.queue.queue, 6000);
    near(frames[1499].totals.goodput, 80);
  });

  it("falls to 40 once the queue is full and reports failures", () => {
    near(frames[1500].totals.goodput, 40);
    near(last(frames).totals.goodput, 40);
    near(last(frames).totals.dropped, 40);
    near(last(frames).totals.lost, 0);
  });
});

describe("S3b queue behind an async edge", () => {
  const frames = run(
    {
      nodes: [
        { id: "client", preset: "client", overrides: { rps: 80 } },
        { id: "api", preset: "compute", overrides: { capacity: 100 } },
        {
          id: "queue",
          preset: "queue",
          overrides: { capacity: 40, buffer: 6000 },
        },
        { id: "db", preset: "database", overrides: { capacity: 50 } },
      ],
      edges: [
        edge("client", "api"),
        edge("api", "queue", "async"),
        edge("queue", "db"),
      ],
    },
    1600,
  );

  it("keeps goodput at 80 for the whole run", () => {
    for (const frame of frames) near(frame.totals.goodput, 80);
  });

  it("reports the overflow as lost, not dropped", () => {
    near(frames[1499].totals.lost, 0);
    near(last(frames).totals.lost, 40);
    near(last(frames).totals.dropped, 0);
  });
});

describe("S4 spike absorbed", () => {
  const spike = (tick: number) => (tick < 100 ? 4 : 1);

  it("peaks at 1,000 deep and 10 s of lag, then drains with no drops", () => {
    const frames = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 50 } },
          {
            id: "queue",
            preset: "queue",
            overrides: { capacity: 100, buffer: 2000 },
          },
        ],
        edges: [edge("client", "queue")],
      },
      400,
      spike,
    );

    near(Math.max(...frames.map((f) => f.nodes.queue.queue)), 1000);
    near(Math.max(...frames.map((f) => f.nodes.queue.lagSeconds)), 10);
    near(frames[298].nodes.queue.queue, 5);
    near(frames[299].nodes.queue.queue, 0);
    expect(
      frames.every((f) => f.totals.dropped === 0 && f.totals.lost === 0),
    ).toBe(true);
  });

  it("drops 1,000 requests against a 100 req/s service with no buffer", () => {
    const frames = run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 50 } },
          { id: "api", preset: "compute", overrides: { capacity: 100 } },
        ],
        edges: [edge("client", "api")],
      },
      400,
      spike,
    );

    near(droppedVolume(frames), 1000);
  });
});

describe("S5 cache", () => {
  const scenario = (hitRatio: number) =>
    run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 1000 } },
          {
            id: "cdn",
            preset: "cache",
            overrides: { capacity: 5000, hitRatio },
          },
          { id: "api", preset: "compute", overrides: { capacity: 150 } },
        ],
        edges: [edge("client", "cdn"), edge("cdn", "api")],
      },
      20,
    );

  it("passes everything at a 90% hit ratio", () => {
    const { nodes, totals } = last(scenario(0.9));
    near(nodes.api.offered, 100);
    near(nodes.api.dropped, 0);
    near(totals.goodput, 1000);
  });

  it("loses 350 req/s at a 50% hit ratio", () => {
    const { nodes, totals } = last(scenario(0.5));
    near(nodes.api.offered, 500);
    near(nodes.api.dropped, 350);
    near(totals.goodput, 650);
  });
});

describe("S6 load balancer", () => {
  const frames = run(
    {
      nodes: [
        { id: "client", preset: "client", overrides: { rps: 300 } },
        { id: "lb", preset: "loadBalancer" },
        { id: "a", preset: "compute", overrides: { capacity: 100 } },
        { id: "b", preset: "compute", overrides: { capacity: 100 } },
      ],
      edges: [edge("client", "lb"), edge("lb", "a"), edge("lb", "b")],
    },
    20,
  );

  it("splits evenly and admits 100 on each side", () => {
    const { nodes, totals } = last(frames);
    near(nodes.a.offered, 150);
    near(nodes.b.offered, 150);
    near(nodes.a.admitted, 100);
    near(nodes.b.dropped, 50);
    near(totals.goodput, 200);
  });
});

describe("S7 async decoupling", () => {
  const scenario = (mode: EdgeMode) =>
    run(
      {
        nodes: [
          { id: "client", preset: "client", overrides: { rps: 100 } },
          { id: "api", preset: "compute", overrides: { capacity: 200 } },
          { id: "worker", preset: "compute", overrides: { capacity: 40 } },
        ],
        edges: [edge("client", "api"), edge("api", "worker", mode)],
      },
      20,
    );

  it("keeps goodput at 100 and loses 60 req/s with an async edge", () => {
    const { totals } = last(scenario("async"));
    near(totals.goodput, 100);
    near(totals.lost, 60);
    near(totals.dropped, 0);
  });

  it("falls to 40 with a sync edge", () => {
    const { totals } = last(scenario("sync"));
    near(totals.goodput, 40);
    near(totals.dropped, 60);
    near(totals.lost, 0);
  });
});

describe("S8 fan-out with shares", () => {
  const frames = run(
    {
      nodes: [
        { id: "client", preset: "client", overrides: { rps: 100 } },
        { id: "api", preset: "compute" },
        { id: "db", preset: "database" },
        { id: "payment", preset: "external", overrides: { failRate: 0.05 } },
      ],
      edges: [
        edge("client", "api"),
        edge("api", "db", "sync", 1),
        edge("api", "payment", "sync", 0.2),
      ],
    },
    20,
  );

  it("multiplies the call success fractions", () => {
    near(last(frames).totals.goodput, 99);
  });

  it("flags 5% of the payment calls as failed", () => {
    const { edges } = last(frames);
    near(edges["api-db"].flow, 100);
    near(edges["api-payment"].flow, 20);
    near(edges["api-payment"].failed, 1);
  });
});
