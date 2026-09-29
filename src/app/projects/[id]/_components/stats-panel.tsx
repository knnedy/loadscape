"use client";

import { useMemo } from "react";
import { categories } from "@/lib/catalog/components";
import { computeTopologyStats } from "../_lib/topology-stats";
import { useTopologyStore } from "../_store/topology-provider";

export function StatsPanel() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const stats = useMemo(
    () => computeTopologyStats(nodes, edges),
    [nodes, edges],
  );

  if (stats.componentCount === 0) return null;

  const rows = categories
    .map(({ category, label }) => ({
      category,
      label,
      count: stats.byCategory[category] ?? 0,
    }))
    .filter((row) => row.count > 0);
  const totalEdges = stats.syncEdges + stats.asyncEdges;

  return (
    <aside className="pointer-events-none absolute top-4 right-4 z-10 w-48 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm select-none">
      <p className="text-sm font-semibold text-foreground">
        {stats.componentCount}{" "}
        {stats.componentCount === 1 ? "component" : "components"}
      </p>

      <ul className="mt-2 flex flex-col gap-1">
        {rows.map(({ category, label, count }) => (
          <li key={category} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: `var(--cat-${category})` }}
            />
            <span className="flex-1 truncate text-muted-foreground">
              {label}
            </span>
            <span className="text-foreground tabular-nums">{count}</span>
          </li>
        ))}
      </ul>

      {totalEdges > 0 && (
        <div className="mt-3">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="bg-foreground/70"
              style={{ width: `${(stats.syncEdges / totalEdges) * 100}%` }}
            />
            <div
              className="bg-foreground/30"
              style={{ width: `${(stats.asyncEdges / totalEdges) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>{stats.syncEdges} sync</span>
            <span>{stats.asyncEdges} async</span>
          </p>
        </div>
      )}
    </aside>
  );
}
