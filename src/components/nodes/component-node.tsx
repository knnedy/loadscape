"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import type { TopologyNodeData } from "@/lib/types/topology";
import { componentCatalog } from "@/lib/catalog/components";

export function ComponentNode({ data, selected }: NodeProps<TopologyNodeData>) {
  const component = componentCatalog.find((c) => c.id === data.componentId);
  const Icon = component?.icon;

  return (
    <div
      className={`flex min-w-36 items-center gap-2 rounded-md border bg-card px-3 py-2 shadow-sm transition-colors ${
        selected ? "border-accent ring-1 ring-accent" : "border-border"
      }`}>
      <Handle type="target" position={Position.Left} className="bg-border!" />
      {Icon && <Icon size={16} className="shrink-0 text-foreground" />}
      <div className="flex flex-col overflow-hidden">
        <span className="truncate text-xs font-medium text-foreground">
          {data.label}
        </span>
        <span className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">
          {data.category}
        </span>
      </div>
      <Handle type="source" position={Position.Right} className="bg-border!" />
    </div>
  );
}
