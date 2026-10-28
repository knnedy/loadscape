"use client";

import type { ReactNode } from "react";
import { useTopologyStore } from "../../_store/topology-provider";
import { BulkEditPanel } from "./bulk-edit-panel";
import { EdgeConfig } from "./edge-config";
import { NodeConfig } from "./node-config";

function Shell({ children }: { children: ReactNode }) {
  return (
    <aside className="w-70 shrink-0 overflow-y-auto border-l border-border bg-card p-4">
      {children}
    </aside>
  );
}

export function ConfigPanel() {
  const selectionCount = useTopologyStore(
    (s) =>
      s.nodes.filter((n) => n.selected).length +
      s.edges.filter((e) => e.selected).length,
  );
  const nodeId = useTopologyStore((s) =>
    s.detailsOpen &&
    s.inspected?.kind === "node" &&
    s.nodes.some((n) => n.id === s.inspected?.id && n.type === "component")
      ? s.inspected.id
      : null,
  );
  const edgeId = useTopologyStore((s) =>
    s.detailsOpen &&
    s.inspected?.kind === "edge" &&
    s.edges.some((e) => e.id === s.inspected?.id)
      ? s.inspected.id
      : null,
  );

  if (selectionCount > 1) return <BulkEditPanel />;
  if (nodeId) {
    return (
      <Shell>
        <NodeConfig id={nodeId} />
      </Shell>
    );
  }
  if (edgeId) {
    return (
      <Shell>
        <EdgeConfig id={edgeId} />
      </Shell>
    );
  }
  return null;
}
