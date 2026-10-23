"use client";

import { useMemo, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { categories } from "@/lib/catalog/components";
import type { NodeCategory, TopologyNodeData } from "@/lib/types/topology";
import { computeTopologyStats } from "../../_lib/topology-stats";
import { useTopologyStore } from "../../_store/topology-provider";

const FIT_OPTIONS = { maxZoom: 1, padding: 0.4, duration: 300 };

const rowClass =
  "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent";

export function StatsChip() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const stats = useMemo(
    () => computeTopologyStats(nodes, edges),
    [nodes, edges],
  );
  const { fitView } = useReactFlow();
  const [open, setOpen] = useState(false);

  if (stats.componentCount === 0) return null;

  const rows = categories
    .map(({ category, label }) => ({
      category,
      label,
      count: stats.byCategory[category] ?? 0,
    }))
    .filter((row) => row.count > 0);
  const totalEdges = stats.syncEdges + stats.asyncEdges;

  function frameCategory(category: NodeCategory) {
    const targets = nodes
      .filter(
        (n) =>
          n.type === "component" &&
          (n.data as TopologyNodeData).category === category,
      )
      .map((n) => ({ id: n.id }));
    if (targets.length === 0) return;
    setOpen(false);
    fitView({ ...FIT_OPTIONS, nodes: targets });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Diagram summary"
        className="group absolute top-16 right-4 z-10 flex h-7.5 items-center gap-1.5 rounded-xl border border-border bg-card/95 pr-2 pl-3 text-[11px] text-muted-foreground tabular-nums shadow-lg backdrop-blur-sm transition-colors outline-none select-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-expanded:bg-accent aria-expanded:text-foreground">
        <span>
          {stats.componentCount}{" "}
          {stats.componentCount === 1 ? "component" : "components"}
        </span>
        {totalEdges > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span>{stats.syncEdges} sync</span>
            <span aria-hidden="true">·</span>
            <span>{stats.asyncEdges} async</span>
          </>
        )}
        <ChevronDown
          size={12}
          className="ml-0.5 transition-transform group-aria-expanded:rotate-180"
        />
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-64 p-1">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Components
        </p>
        <ul>
          {rows.map(({ category, label, count }) => (
            <li key={category}>
              <button
                type="button"
                onClick={() => frameCategory(category)}
                aria-label={`Show ${label} components on the canvas`}
                className={rowClass}>
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--cat-${category})` }}
                />
                <span className="flex-1 truncate text-foreground">{label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {count}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <div className="my-1 h-px bg-border" />

        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Connections
        </p>
        {totalEdges === 0 ? (
          <p className="px-2 pb-2 text-xs text-muted-foreground">
            No connections yet.
          </p>
        ) : (
          <div className="px-2 pb-2">
            <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="bg-primary"
                style={{ width: `${(stats.syncEdges / totalEdges) * 100}%` }}
              />
              <div
                className="bg-primary/35"
                style={{ width: `${(stats.asyncEdges / totalEdges) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 flex justify-between text-xs text-muted-foreground">
              <span>{stats.syncEdges} sync</span>
              <span>{stats.asyncEdges} async</span>
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
