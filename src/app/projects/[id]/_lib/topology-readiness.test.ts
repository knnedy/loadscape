import { describe, expect, it } from "vitest";
import type { NodeCategory } from "@/lib/types/topology";
import type { AppEdge, AppNode } from "../_store/topology-store";
import { analyzeReadiness } from "./topology-readiness";

function component(
  id: string,
  componentId: string,
  category: NodeCategory,
): AppNode {
  return {
    id,
    type: "component",
    position: { x: 0, y: 0 },
    data: { componentId, label: id, category },
  };
}

const client = (id = "client") => component(id, "client", "client");
const api = (id = "api") => component(id, "api-server", "compute");
const db = (id = "db") => component(id, "postgresql", "database");

function edge(
  source: string,
  target: string,
  direction: "forward" | "bidirectional" | "none" = "forward",
): AppEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: "component",
    data: { style: "sync", direction },
  };
}

describe("analyzeReadiness", () => {
  it("reports nothing and blocks Run on an empty diagram", () => {
    const result = analyzeReadiness([], []);

    expect(result.componentCount).toBe(0);
    expect(result.issues).toEqual([]);
    expect(result.canRun).toBe(false);
  });

  it("errors when there is no client", () => {
    const result = analyzeReadiness([api(), db()], [edge("api", "db")]);

    expect(result.errorCount).toBe(1);
    expect(result.issues[0].id).toBe("no-traffic-source");
    expect(result.canRun).toBe(false);
  });

  it("allows a healthy chain to run with no issues", () => {
    const result = analyzeReadiness(
      [client(), api(), db()],
      [edge("client", "api"), edge("api", "db")],
    );

    expect(result.issues).toEqual([]);
    expect(result.canRun).toBe(true);
  });

  it("no longer warns about capacity on components without an override", () => {
    const result = analyzeReadiness([client(), api()], [edge("client", "api")]);

    expect(result.issues.some((i) => i.id.startsWith("capacity-"))).toBe(false);
  });

  it("blocks Run on a cycle with the engine's message", () => {
    const result = analyzeReadiness(
      [client(), api("a"), api("b")],
      [edge("client", "a"), edge("a", "b"), edge("b", "a")],
    );

    expect(result.canRun).toBe(false);
    const issue = result.issues.find((i) => i.id === "graph");
    expect(issue?.severity).toBe("error");
    expect(issue?.message).toContain("cycle");
  });

  it("reports only the missing client when there is also a cycle", () => {
    const result = analyzeReadiness(
      [api("a"), api("b")],
      [edge("a", "b"), edge("b", "a")],
    );

    expect(result.errorCount).toBe(1);
    expect(result.issues[0].id).toBe("no-traffic-source");
  });

  it("treats a bidirectional edge as one call, not a cycle", () => {
    const result = analyzeReadiness(
      [client(), api()],
      [edge("client", "api", "bidirectional")],
    );

    expect(result.issues).toEqual([]);
    expect(result.canRun).toBe(true);
  });

  it("warns about a disconnected component without blocking Run", () => {
    const result = analyzeReadiness(
      [client(), api(), db()],
      [edge("client", "api")],
    );

    expect(result.warningCount).toBe(1);
    expect(result.issues[0].nodeId).toBe("db");
    expect(result.canRun).toBe(true);
  });

  it("lists errors before warnings", () => {
    const result = analyzeReadiness(
      [client(), api("a"), api("b"), db()],
      [edge("client", "a"), edge("a", "b"), edge("b", "a")],
    );

    expect(result.issues.map((i) => i.severity)).toEqual(["error", "warning"]);
  });
});
