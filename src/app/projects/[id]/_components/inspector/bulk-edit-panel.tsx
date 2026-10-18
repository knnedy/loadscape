"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { capacityPresets } from "@/lib/catalog/capacity-presets";
import type { TopologyNodeData } from "@/lib/types/topology";
import { cn } from "@/lib/utils";
import { useTopologyStore } from "../../_store/topology-provider";

const EDGE_STYLES = ["sync", "async"] as const;
const EDGE_DIRECTIONS = ["forward", "bidirectional", "none"] as const;

function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
}

function segmentClass(active: boolean, small = false) {
  return cn(
    "flex-1 rounded-md border px-2 py-1 capitalize transition-colors",
    small ? "text-[11px]" : "text-xs",
    active
      ? "border-primary bg-primary/10 text-primary"
      : "border-border text-muted-foreground hover:bg-accent",
  );
}

export function BulkEditPanel() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const updateSelectedCapacity = useTopologyStore(
    (s) => s.updateSelectedCapacity,
  );
  const updateSelectedEdges = useTopologyStore((s) => s.updateSelectedEdges);

  const selection = useMemo(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    return {
      components: selectedNodes.filter((n) => n.type === "component"),
      groups: selectedNodes.filter((n) => n.type === "group-container"),
      notes: selectedNodes.filter((n) => n.type === "note"),
      edges: edges.filter((e) => e.selected),
    };
  }, [nodes, edges]);

  const { components, groups, notes } = selection;
  const selectedEdges = selection.edges;
  const total =
    components.length + groups.length + notes.length + selectedEdges.length;

  const summary = [
    components.length > 0 && plural(components.length, "component"),
    groups.length > 0 && plural(groups.length, "group"),
    notes.length > 0 && plural(notes.length, "note"),
    selectedEdges.length > 0 && plural(selectedEdges.length, "connection"),
  ]
    .filter(Boolean)
    .join(", ");

  const capacities = components.map(
    (n) => (n.data as TopologyNodeData).capacity,
  );
  const capacityMixed = new Set(capacities).size > 1;
  const capacity = capacityMixed ? undefined : capacities[0];

  const styles = new Set(selectedEdges.map((e) => e.data?.style));
  const directions = new Set(selectedEdges.map((e) => e.data?.direction));
  const commonStyle = styles.size === 1 ? [...styles][0] : undefined;
  const commonDirection =
    directions.size === 1 ? [...directions][0] : undefined;

  return (
    <aside className="w-70 shrink-0 overflow-y-auto border-l border-border bg-card p-4">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {total} selected
      </span>
      <p className="mt-2 text-sm text-muted-foreground">{summary}</p>

      {components.length > 0 && (
        <div className="mt-5 flex flex-col gap-1.5">
          <Label htmlFor="bulk-capacity" className="text-xs">
            Capacity (req/sec)
          </Label>
          <Input
            id="bulk-capacity"
            type="number"
            value={capacity ?? ""}
            placeholder={capacityMixed ? "Mixed" : undefined}
            onChange={(e) =>
              updateSelectedCapacity(
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
            className="font-mono"
          />
          <div className="mt-1 flex gap-1.5">
            {capacityPresets.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => updateSelectedCapacity(value)}
                className={cn(
                  "flex flex-1 flex-col items-center rounded-md border px-2 py-1 transition-colors",
                  !capacityMixed && capacity === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}>
                <span className="text-xs">{label}</span>
                <span className="font-mono text-[11px]">
                  {value.toLocaleString("en-US")}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Applies to {plural(components.length, "component")}.
          </p>
        </div>
      )}

      {selectedEdges.length > 0 && (
        <>
          <div className="mt-5 flex flex-col gap-1.5">
            <Label className="text-xs">Style</Label>
            <div className="flex gap-1.5">
              {EDGE_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => updateSelectedEdges({ style })}
                  className={segmentClass(commonStyle === style)}>
                  {style}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-1.5">
            <Label className="text-xs">Direction</Label>
            <div className="flex gap-1.5">
              {EDGE_DIRECTIONS.map((direction) => (
                <button
                  key={direction}
                  onClick={() => updateSelectedEdges({ direction })}
                  className={segmentClass(commonDirection === direction, true)}>
                  {direction}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Applies to {plural(selectedEdges.length, "connection")}.
            </p>
          </div>
        </>
      )}

      {components.length === 0 && selectedEdges.length === 0 && (
        <p className="mt-5 text-xs text-muted-foreground">
          Select components or connections to edit them together.
        </p>
      )}
    </aside>
  );
}
