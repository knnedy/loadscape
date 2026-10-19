"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import { Copy, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { capacityPresets } from "@/lib/catalog/capacity-presets";
import type { TopologyNodeData } from "@/lib/types/topology";
import { cn } from "@/lib/utils";
import { useTopologyStore } from "../../_store/topology-provider";

const buttonClass =
  "flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

function compact(value: number) {
  return value >= 1000 ? `${value / 1000}k` : String(value);
}

function ComponentToolbar({ id }: { id: string }) {
  const node = useTopologyStore((s) => s.nodes.find((n) => n.id === id));
  const duplicateNode = useTopologyStore((s) => s.duplicateNode);
  const deleteNode = useTopologyStore((s) => s.deleteNode);
  const updateNodeCapacity = useTopologyStore((s) => s.updateNodeCapacity);

  if (!node || node.type !== "component") return null;
  const { capacity } = node.data as TopologyNodeData;

  return (
    <NodeToolbar
      nodeId={id}
      isVisible={!node.dragging}
      position={Position.Top}
      offset={12}>
      <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger
            onClick={() => duplicateNode(id)}
            aria-label="Duplicate"
            className={buttonClass}>
            <Copy size={14} />
          </TooltipTrigger>
          <TooltipContent side="top">
            Duplicate <kbd className="ml-1 opacity-70">⌘D</kbd>
          </TooltipContent>
        </Tooltip>

        <div className="mx-1 h-4 w-px bg-border" />

        {capacityPresets.map(({ label, value }) => (
          <Tooltip key={label}>
            <TooltipTrigger
              onClick={() => updateNodeCapacity(id, value)}
              aria-pressed={capacity === value}
              className={cn(
                buttonClass,
                capacity === value && "bg-primary/12 text-primary",
              )}>
              {compact(value)}
            </TooltipTrigger>
            <TooltipContent side="top">
              {label}: {value.toLocaleString("en-US")} req/s
            </TooltipContent>
          </Tooltip>
        ))}

        <div className="mx-1 h-4 w-px bg-border" />

        <Tooltip>
          <TooltipTrigger
            onClick={() => deleteNode(id)}
            aria-label="Delete"
            className={cn(
              buttonClass,
              "hover:bg-destructive/10 hover:text-destructive",
            )}>
            <Trash2 size={14} />
          </TooltipTrigger>
          <TooltipContent side="top">
            Delete <kbd className="ml-1 opacity-70">Del</kbd>
          </TooltipContent>
        </Tooltip>
      </div>
    </NodeToolbar>
  );
}

export function SelectionToolbar() {
  const id = useTopologyStore((s) =>
    s.inspected?.kind === "node" ? s.inspected.id : null,
  );
  const multiple = useTopologyStore(
    (s) => s.nodes.filter((n) => n.selected).length > 1,
  );

  if (!id || multiple) return null;
  return <ComponentToolbar id={id} />;
}
