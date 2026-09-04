"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import type { TopologyNodeData } from "@/lib/types/topology";
import { componentCatalog } from "@/lib/catalog/components";
import { Icon as IconifyIcon } from "@iconify/react";

export function ComponentNode({ data, selected }: NodeProps<TopologyNodeData>) {
  const component = componentCatalog.find((c) => c.id === data.componentId);

  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-xl px-2.5 py-2 transition-colors ${
        selected ? "bg-primary/10 ring-2 ring-primary" : ""
      }`}
      style={{ minWidth: 84 }}>
      <Handle type="target" position={Position.Left} className="bg-border!" />
      {component && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-2 text-neutral-800 shadow-sm">
          <IconifyIcon icon={component.icon} width={28} height={28} />
        </div>
      )}
      <span className="text-center text-xs leading-tight font-medium text-foreground">
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} className="bg-border!" />
    </div>
  );
}
