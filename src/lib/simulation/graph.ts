import type { SimGraph } from "./types";

export type OrderResult =
  | { ok: true; order: string[] }
  | { ok: false; error: string };

export function orderGraph(graph: SimGraph): OrderResult {
  if (!graph.nodes.some((node) => node.role === "source")) {
    return {
      ok: false,
      error: "Add a client to generate traffic before running.",
    };
  }

  const indegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of graph.nodes) {
    indegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of graph.edges) {
    const targets = outgoing.get(edge.source);
    if (!targets || !indegree.has(edge.target)) {
      return {
        ok: false,
        error: "A connection points to a component that no longer exists.",
      };
    }
    targets.push(edge.target);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const order: string[] = [];
  for (const node of graph.nodes) {
    if (indegree.get(node.id) === 0) order.push(node.id);
  }

  for (let head = 0; head < order.length; head++) {
    for (const target of outgoing.get(order[head]) ?? []) {
      const remaining = (indegree.get(target) ?? 0) - 1;
      indegree.set(target, remaining);
      if (remaining === 0) order.push(target);
    }
  }

  if (order.length < graph.nodes.length) {
    return {
      ok: false,
      error: "The diagram has a cycle. Remove the loop to run it.",
    };
  }

  return { ok: true, order };
}
