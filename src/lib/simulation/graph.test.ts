import { describe, expect, it } from "vitest";
import { orderGraph, type OrderResult } from "./graph";
import {
  resolveGraph,
  type EdgeInput,
  type GraphInput,
  type NodeInput,
} from "./presets";

function node(id: string, preset: NodeInput["preset"] = "compute"): NodeInput {
  return { id, preset };
}

function edge(source: string, target: string): EdgeInput {
  return { id: `${source}-${target}`, source, target, mode: "sync" };
}

function order(input: GraphInput): OrderResult {
  return orderGraph(resolveGraph(input));
}

function orderOf(input: GraphInput): string[] {
  const result = order(input);
  if (!result.ok) throw new Error(result.error);
  return result.order;
}

describe("refusals", () => {
  it("refuses a diagram with no client", () => {
    const result = order({
      nodes: [node("api"), node("db", "database")],
      edges: [edge("api", "db")],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("client");
  });

  it("refuses an empty diagram", () => {
    const result = order({ nodes: [], edges: [] });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("client");
  });

  it("refuses a cycle", () => {
    const result = order({
      nodes: [node("client", "client"), node("a"), node("b")],
      edges: [edge("client", "a"), edge("a", "b"), edge("b", "a")],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("cycle");
  });

  it("refuses a node that calls itself", () => {
    const result = order({
      nodes: [node("client", "client"), node("a")],
      edges: [edge("client", "a"), edge("a", "a")],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("cycle");
  });

  it("refuses an edge whose source does not exist", () => {
    const result = order({
      nodes: [node("client", "client"), node("a")],
      edges: [edge("client", "a"), edge("ghost", "a")],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("no longer exists");
  });

  it("refuses an edge whose target does not exist", () => {
    const result = order({
      nodes: [node("client", "client"), node("a")],
      edges: [edge("client", "a"), edge("a", "ghost")],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("no longer exists");
  });

  it("reports the missing client before a cycle", () => {
    const result = order({
      nodes: [node("a"), node("b")],
      edges: [edge("a", "b"), edge("b", "a")],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("client");
  });
});

describe("ordering", () => {
  it("puts every caller before its targets", () => {
    const result = orderOf({
      nodes: [
        node("db", "database"),
        node("api"),
        node("lb", "loadBalancer"),
        node("client", "client"),
      ],
      edges: [edge("client", "lb"), edge("lb", "api"), edge("api", "db")],
    });

    expect(result).toEqual(["client", "lb", "api", "db"]);
  });

  it("orders a diamond with the client first and the join last", () => {
    const result = orderOf({
      nodes: [
        node("client", "client"),
        node("lb", "loadBalancer"),
        node("a"),
        node("b"),
        node("db", "database"),
      ],
      edges: [
        edge("client", "lb"),
        edge("lb", "a"),
        edge("lb", "b"),
        edge("a", "db"),
        edge("b", "db"),
      ],
    });

    expect(result).toEqual(["client", "lb", "a", "b", "db"]);
  });

  it("keeps nodes that no client reaches", () => {
    const result = orderOf({
      nodes: [node("client", "client"), node("api"), node("orphan")],
      edges: [edge("client", "api")],
    });

    expect(result).toHaveLength(3);
    expect(result).toContain("orphan");
  });

  it("returns the same order every time", () => {
    const input: GraphInput = {
      nodes: [
        node("client", "client"),
        node("lb", "loadBalancer"),
        node("a"),
        node("b"),
        node("cache", "cache"),
        node("db", "database"),
      ],
      edges: [
        edge("client", "lb"),
        edge("lb", "a"),
        edge("lb", "b"),
        edge("a", "cache"),
        edge("b", "cache"),
        edge("cache", "db"),
      ],
    };

    expect(orderOf(input)).toEqual(orderOf(input));
  });
});
