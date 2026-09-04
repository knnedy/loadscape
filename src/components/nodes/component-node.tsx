"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import type { TopologyNodeData, NodeCategory } from "@/lib/types/topology";
import { componentCatalog } from "@/lib/catalog/components";

const categoryColorVar: Record<NodeCategory, string> = {
  client: "var(--cat-client)",
  networking: "var(--cat-networking)",
  compute: "var(--cat-compute)",
  database: "var(--cat-database)",
  cache: "var(--cat-cache)",
  messaging: "var(--cat-messaging)",
  auth: "var(--cat-auth)",
  storage: "var(--cat-storage)",
  search: "var(--cat-search)",
};

export function ComponentNode({ data, selected }: NodeProps<TopologyNodeData>) {
  const component = componentCatalog.find((c) => c.id === data.componentId);
  const Icon = component?.icon;
  const accentColor = categoryColorVar[data.category];

  return (
    <div
      className="flex min-w-40 items-center gap-2.5 rounded-xl border-2 bg-card px-3.5 py-3 transition-shadow hover:shadow-lg"
      style={{
        borderColor: selected ? "var(--accent)" : accentColor,
        boxShadow: selected
          ? "0 0 0 2px var(--accent), 0 6px 16px rgba(0,0,0,0.25)"
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}>
      <Handle type="target" position={Position.Left} className="bg-border!" />
      {Icon && (
        <Icon size={18} style={{ color: accentColor }} className="shrink-0" />
      )}
      <div className="flex flex-col overflow-hidden">
        <span className="truncate text-[13px] font-medium text-foreground">
          {data.label}
        </span>
        <span className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {data.category}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="bg-border!" />
    </div>
  );
}
