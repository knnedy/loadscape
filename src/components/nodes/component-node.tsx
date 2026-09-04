"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import type { TopologyNodeData } from "@/lib/types/topology";
import { componentCatalog } from "@/lib/catalog/components";
import { Icon as IconifyIcon } from "@iconify/react";

export function ComponentNode({ data, selected }: NodeProps<TopologyNodeData>) {
  const component = componentCatalog.find((c) => c.id === data.componentId);

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
        selected ? "bg-(--accent)/10 ring-2 ring-accent" : ""
      }`}>
      <Handle type="target" position={Position.Left} className="bg-border!" />
      {component && (
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white p-1">
          <IconifyIcon icon={component.icon} width={16} height={16} />
        </div>
      )}
      <span className="text-sm font-medium whitespace-nowrap text-foreground">
        {data.label}
      </span>
      <Handle type="source" position={Position.Right} className="bg-border!" />
    </div>
  );
}
