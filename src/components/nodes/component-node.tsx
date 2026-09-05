"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { X } from "lucide-react";
import type { TopologyNodeData } from "@/lib/types/topology";
import { componentCatalog } from "@/lib/catalog/components";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import { Icon as IconifyIcon } from "@iconify/react";

export function ComponentNode({
  id,
  data,
  selected,
}: NodeProps<TopologyNodeData>) {
  const component = componentCatalog.find((c) => c.id === data.componentId);
  const deleteNode = useTopologyStore((s) => s.deleteNode);

  return (
    <div
      className={`group relative flex flex-col items-center gap-1.5 rounded-xl px-2.5 py-2 transition-colors ${
        selected ? "bg-primary/10 ring-2 ring-primary" : ""
      }`}
      style={{ minWidth: 84 }}>
      {selected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteNode(id);
          }}
          className="nodrag absolute -top-2 -right-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:opacity-90">
          <X size={12} />
        </button>
      )}
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
