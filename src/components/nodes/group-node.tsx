"use client";

import { useState } from "react";
import { NodeResizer, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { groupColorPalette } from "@/lib/catalog/group-colors";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import type { TopologyGroupData } from "@/lib/types/topology";

export function GroupNode({
  id,
  data,
  selected,
}: NodeProps<TopologyGroupData>) {
  const renameGroup = useTopologyStore((s) => s.renameGroup);
  const updateGroupColor = useTopologyStore((s) => s.updateGroupColor);
  const deleteNode = useTopologyStore((s) => s.deleteNode);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed) renameGroup(id, trimmed);
    else setDraft(data.label);
    setEditing(false);
  }

  return (
    <>
      <NodeResizer
        minWidth={220}
        minHeight={160}
        isVisible={selected}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        lineStyle={{ borderColor: "var(--primary)" }}
      />
      <div
        className="h-full w-full rounded-xl border-2"
        style={{
          borderColor: data.color,
          backgroundColor: `color-mix(in oklch, ${data.color} 7%, transparent)`,
        }}
      />
      <div className="nodrag absolute -top-3 left-3 flex items-center gap-1.5">
        <Popover>
          <PopoverTrigger
            className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-card"
            style={{ backgroundColor: data.color }}
          />
          <PopoverContent
            side="bottom"
            align="start"
            className="flex w-auto gap-1.5 p-2">
            {groupColorPalette.map((color) => (
              <button
                key={color}
                onClick={() => updateGroupColor(id, color)}
                className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: color }}
              />
            ))}
          </PopoverContent>
        </Popover>
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
            className="w-32 rounded border border-border bg-card px-1.5 py-0.5 text-xs text-foreground outline-none"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className="rounded-md px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: data.color }}>
            {data.label}
          </span>
        )}
      </div>
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
    </>
  );
}
