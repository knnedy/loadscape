"use client";

import { NodeResizer, type NodeProps } from "reactflow";
import { X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { groupColorPalette } from "@/lib/catalog/group-colors";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import type { TopologyNoteData } from "@/lib/types/topology";

export function NoteNode({ id, data, selected }: NodeProps<TopologyNoteData>) {
  const updateNoteText = useTopologyStore((s) => s.updateNoteText);
  const updateNoteColor = useTopologyStore((s) => s.updateNoteColor);
  const deleteNode = useTopologyStore((s) => s.deleteNode);

  return (
    <>
      <NodeResizer
        minWidth={140}
        minHeight={100}
        isVisible={selected}
        handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
        lineStyle={{ borderColor: "var(--primary)" }}
      />
      <div
        className="flex h-full w-full flex-col rounded-lg border-2 p-2 shadow-sm"
        style={{
          borderColor: data.color,
          backgroundColor: `color-mix(in oklch, ${data.color} 12%, var(--card))`,
        }}>
        <div className="mb-1 flex items-center justify-between">
          <Popover>
            <PopoverTrigger
              className="nodrag h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <PopoverContent
              side="top"
              align="start"
              className="flex w-auto gap-1.5 p-2">
              {groupColorPalette.map((color) => (
                <button
                  key={color}
                  onClick={() => updateNoteColor(id, color)}
                  className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                />
              ))}
            </PopoverContent>
          </Popover>
          {selected && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteNode(id);
              }}
              className="nodrag flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground hover:opacity-90">
              <X size={10} />
            </button>
          )}
        </div>
        <textarea
          value={data.text}
          onChange={(e) => updateNoteText(id, e.target.value)}
          placeholder="Write a note..."
          className="nodrag flex-1 resize-none border-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </>
  );
}
