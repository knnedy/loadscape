"use client";

import { useRef, useState } from "react";
import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { groupColorPalette } from "@/lib/catalog/group-colors";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import type { TopologyGroupData } from "@/lib/types/topology";

type GroupNodeType = Node<TopologyGroupData, "group-container">;

export function GroupNode({ id, data, selected }: NodeProps<GroupNodeType>) {
  const renameGroup = useTopologyStore((s) => s.renameGroup);
  const updateGroupColor = useTopologyStore((s) => s.updateGroupColor);
  const readOnly = useTopologyStore((s) => s.readOnly);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  // Enter and blur can both fire; only the first one counts.
  const settledRef = useRef(false);

  function startEditing() {
    settledRef.current = false;
    setDraft(data.label);
    setEditing(true);
  }

  function cancel() {
    settledRef.current = true;
    setEditing(false);
  }

  function commit() {
    if (settledRef.current) return;
    settledRef.current = true;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== data.label) renameGroup(id, trimmed);
    setEditing(false);
  }

  return (
    <>
      <NodeResizer
        minWidth={220}
        minHeight={160}
        isVisible={selected && !readOnly}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        lineStyle={{ borderColor: "var(--primary)" }}
      />
      <div
        className="h-full w-full rounded-xl border-2 border-dashed"
        style={{
          borderColor: data.color,
          backgroundColor: `color-mix(in oklch, ${data.color} 7%, transparent)`,
        }}
      />
      <div className="nodrag absolute -top-3 left-3 flex items-center gap-1.5">
        {readOnly ? (
          <span
            className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-card"
            style={{ backgroundColor: data.color }}
          />
        ) : (
          <Popover>
            <PopoverTrigger
              aria-label="Group color"
              className="h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-card"
              style={{ backgroundColor: data.color }}
            />
            <PopoverContent
              side="bottom"
              align="start"
              className="flex w-auto gap-1.5 p-2">
              {groupColorPalette.map((color, index) => (
                <button
                  key={color}
                  aria-label={`Color ${index + 1}`}
                  onClick={() => updateGroupColor(id, color)}
                  className="relative flex h-5 w-5 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: color,
                    boxShadow:
                      color === data.color
                        ? "0 0 0 2px var(--popover), 0 0 0 3.5px var(--foreground)"
                        : undefined,
                  }}>
                  {color === data.color && (
                    <Check size={11} className="text-white" strokeWidth={3} />
                  )}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            aria-label="Group name"
            className="w-32 rounded border border-border bg-card px-1.5 py-0.5 text-xs text-foreground outline-none"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!readOnly) startEditing();
            }}
            className="rounded-md px-2 py-0.5 text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: data.color }}>
            {data.label}
          </span>
        )}
      </div>
    </>
  );
}
