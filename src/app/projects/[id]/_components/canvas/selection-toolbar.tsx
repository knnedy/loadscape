"use client";

import type { ReactNode } from "react";
import { NodeToolbar, Position } from "@xyflow/react";
import { Copy, SlidersHorizontal, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  capacityOverride,
  capacityTiers,
  defaultCapacity,
  formatRate,
  formatRateCompact,
  limitsCapacity,
} from "@/lib/simulation/capacity";
import type { TopologyNodeData } from "@/lib/types/topology";
import { cn } from "@/lib/utils";
import { useTopologyStore } from "../../_store/topology-provider";

const buttonClass =
  "flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

function Divider() {
  return <div className="mx-1 h-4 w-px bg-border" />;
}

function ToolbarButton({
  label,
  shortcut,
  pressed,
  destructive,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  pressed?: boolean;
  destructive?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        onClick={onClick}
        aria-label={label}
        aria-pressed={pressed}
        className={cn(
          buttonClass,
          pressed && "bg-primary/12 text-primary",
          destructive && "hover:bg-destructive/10 hover:text-destructive",
        )}>
        {children}
      </TooltipTrigger>
      <TooltipContent side="top">
        {label}
        {shortcut && <kbd className="ml-1 opacity-70">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

function NodeActions({ id }: { id: string }) {
  const node = useTopologyStore((s) => s.nodes.find((n) => n.id === id));
  const detailsOpen = useTopologyStore((s) => s.detailsOpen);
  const duplicateNode = useTopologyStore((s) => s.duplicateNode);
  const deleteNode = useTopologyStore((s) => s.deleteNode);
  const updateNodeConfig = useTopologyStore((s) => s.updateNodeConfig);
  const openDetails = useTopologyStore((s) => s.openDetails);

  if (!node) return null;

  const isComponent = node.type === "component";
  const data = isComponent ? (node.data as TopologyNodeData) : undefined;
  const limits = data ? limitsCapacity(data.componentId, data.category) : false;
  const base = data ? defaultCapacity(data.componentId, data.category) : 0;
  const current = data?.capacity ?? base;

  return (
    <NodeToolbar
      nodeId={id}
      isVisible={!node.dragging}
      position={Position.Top}
      align={isComponent ? "center" : "end"}
      offset={12}>
      <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
        {node.type !== "group-container" && (
          <ToolbarButton
            label="Duplicate"
            shortcut="⌘D"
            onClick={() => duplicateNode(id)}>
            <Copy size={14} />
          </ToolbarButton>
        )}

        {isComponent && (
          <>
            <Divider />
            {limits && (
              <>
                {capacityTiers(base).map((tier) => (
                  <ToolbarButton
                    key={tier.label}
                    label={`${tier.label}: ${formatRate(tier.value)} req/s`}
                    pressed={current === tier.value}
                    onClick={() =>
                      updateNodeConfig(id, {
                        capacity: capacityOverride(tier.value, base),
                      })
                    }>
                    {formatRateCompact(tier.value)}
                  </ToolbarButton>
                ))}
                <Divider />
              </>
            )}
            <ToolbarButton
              label="Details"
              pressed={detailsOpen}
              onClick={openDetails}>
              <SlidersHorizontal size={14} />
            </ToolbarButton>
          </>
        )}

        <ToolbarButton
          label="Delete"
          shortcut="Del"
          destructive
          onClick={() => deleteNode(id)}>
          <Trash2 size={14} />
        </ToolbarButton>
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
  return <NodeActions id={id} />;
}
