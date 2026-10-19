"use client";

import { useMemo } from "react";
import { computeTopologyStats } from "../../_lib/topology-stats";
import { useTopologyStore } from "../../_store/topology-provider";

export function StatsChip() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const stats = useMemo(
    () => computeTopologyStats(nodes, edges),
    [nodes, edges],
  );

  if (stats.componentCount === 0) return null;

  const hasEdges = stats.syncEdges + stats.asyncEdges > 0;

  return (
    <aside className="pointer-events-none absolute top-16 right-4 z-10 flex h-7.5 items-center gap-1.5 rounded-xl border border-border bg-card/95 px-3 text-[11px] text-muted-foreground tabular-nums shadow-lg backdrop-blur-sm select-none">
      <span>
        {stats.componentCount}{" "}
        {stats.componentCount === 1 ? "component" : "components"}
      </span>
      {hasEdges && (
        <>
          <span aria-hidden="true">·</span>
          <span>{stats.syncEdges} sync</span>
          <span aria-hidden="true">·</span>
          <span>{stats.asyncEdges} async</span>
        </>
      )}
    </aside>
  );
}
