import type { AppNode } from "./topology-store";

type IdKind = "node" | "group" | "note";

export interface IdCounters {
  next: (kind: IdKind) => number;
  raiseFloor: (nodes: AppNode[]) => void;
}

// Ids look like `<component>-<n>`, `group-<n>` and `note-<n>`. The counters
// must start past the highest suffix already in the diagram, or newly
// generated ids could collide with existing ones.
function highestIdSuffix(nodes: AppNode[]) {
  return nodes.reduce((max, node) => {
    const match = /(\d+)$/.exec(node.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
}

export function createIdCounters(nodes: AppNode[]): IdCounters {
  const start = highestIdSuffix(nodes);
  const counters: Record<IdKind, number> = {
    node: start,
    group: start,
    note: start,
  };

  return {
    next: (kind) => {
      counters[kind] += 1;
      return counters[kind];
    },
    raiseFloor: (incoming) => {
      const floor = highestIdSuffix(incoming);
      for (const kind of Object.keys(counters) as IdKind[]) {
        counters[kind] = Math.max(counters[kind], floor);
      }
    },
  };
}
