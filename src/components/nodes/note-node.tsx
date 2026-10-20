"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NodeResizer, type Node, type NodeProps } from "@xyflow/react";
import { Check, StickyNote } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { groupColorPalette } from "@/lib/catalog/group-colors";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import type { TopologyNoteData } from "@/lib/types/topology";

type NoteNodeType = Node<TopologyNoteData, "note">;

// Typing is written to the store after a pause, so a burst of typing is one
// undo step instead of one per keystroke.
const COMMIT_DELAY_MS = 500;

export function NoteNode({ id, data, selected }: NodeProps<NoteNodeType>) {
  const updateNoteText = useTopologyStore((s) => s.updateNoteText);
  const updateNoteColor = useTopologyStore((s) => s.updateNoteColor);

  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = draftRef.current;
    if (pending === null) return;
    draftRef.current = null;
    setDraft(null);
    updateNoteText(id, pending);
  }, [id, updateNoteText]);

  // Leaving the canvas mid-sentence still saves what was typed.
  useEffect(() => flush, [flush]);

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
        <div className="mb-1 flex items-center">
          <div className="flex items-center gap-1.5">
            <StickyNote
              size={11}
              style={{ color: data.color }}
              className="shrink-0"
            />
            <Popover>
              <PopoverTrigger
                aria-label="Note color"
                className="nodrag h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: data.color }}
              />
              <PopoverContent
                side="top"
                align="start"
                className="flex w-auto gap-1.5 p-2">
                {groupColorPalette.map((color, index) => (
                  <button
                    key={color}
                    aria-label={`Color ${index + 1}`}
                    onClick={() => updateNoteColor(id, color)}
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
          </div>
        </div>
        <textarea
          value={draft ?? data.text}
          onChange={(e) => {
            draftRef.current = e.target.value;
            setDraft(e.target.value);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(flush, COMMIT_DELAY_MS);
          }}
          onBlur={flush}
          aria-label="Note text"
          placeholder="Write a note..."
          className="nodrag nowheel flex-1 resize-none border-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
    </>
  );
}
