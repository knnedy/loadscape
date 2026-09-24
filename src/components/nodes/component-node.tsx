"use client";

import { useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import type { TopologyNodeData } from "@/lib/types/topology";
import {
  componentCatalog,
  getCategoryDef,
  getAnnotation,
} from "@/lib/catalog/components";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import { Icon as IconifyIcon } from "@iconify/react";

type ComponentNodeType = Node<TopologyNodeData, "component">;

export function ComponentNode({
  id,
  data,
  selected,
}: NodeProps<ComponentNodeType>) {
  const component = componentCatalog.find((c) => c.id === data.componentId);
  const categoryDef = getCategoryDef(data.category);
  const annotation = component
    ? getAnnotation(component)
    : categoryDef.defaultAnnotation;
  const isCapsule = categoryDef.shape === "capsule";
  const catColor = `var(--cat-${data.category})`;

  const deleteNode = useTopologyStore((s) => s.deleteNode);
  const renameNode = useTopologyStore((s) => s.renameNode);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) renameNode(id, trimmed);
    else setDraft(data.label);
    setEditing(false);
  }

  const handleStyle = {
    background: catColor,
    width: 8,
    height: 8,
    borderRadius: 2,
    border: "1.5px solid var(--card)",
  };

  return (
    <div
      className={`group relative flex flex-col bg-card transition-shadow ${
        isCapsule
          ? "items-center justify-center rounded-full px-5 py-2.5"
          : "gap-2 rounded-xl px-3 py-2.5"
      }`}
      style={{
        border: `2px solid ${catColor}`,
        boxShadow: selected
          ? "0 0 0 3px color-mix(in oklch, var(--primary) 45%, transparent)"
          : undefined,
        width: isCapsule ? undefined : 160,
        minWidth: isCapsule ? 110 : undefined,
      }}>
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

      <Handle type="target" position={Position.Left} style={handleStyle} />

      <div className={`flex items-center gap-2 ${isCapsule ? "" : "mb-0.5"}`}>
        {component && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white p-0.5 text-neutral-800">
            <IconifyIcon icon={component.icon} width={14} height={14} />
          </div>
        )}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setDraft(data.label);
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="nodrag w-24 rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground outline-none"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="truncate text-[13px] leading-tight font-medium text-foreground">
            {data.label}
          </span>
        )}
      </div>

      {!isCapsule && (
        <>
          {data.capacity != null && (
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>cap</span>
              <span>{data.capacity}</span>
            </div>
          )}
          <div className="truncate text-[11px] text-muted-foreground italic">
            ({annotation})
          </div>
        </>
      )}

      <Handle type="source" position={Position.Right} style={handleStyle} />
    </div>
  );
}
