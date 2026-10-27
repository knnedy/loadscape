"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { defaultCapacity, limitsCapacity } from "@/lib/simulation/capacity";
import type { TopologyNodeData } from "@/lib/types/topology";
import { cn } from "@/lib/utils";
import { useTopologyStore } from "../../_store/topology-provider";
import { CapacityField } from "./capacity-field";

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

function common<T>(values: T[]): { value: T | undefined; mixed: boolean } {
  return new Set(values).size > 1
    ? { value: undefined, mixed: true }
    : { value: values[0], mixed: false };
}

// Clients and external services have unlimited capacity, so a capacity
// value written to them would throttle the traffic they generate or answer.
const limitsLoad = (data: TopologyNodeData) =>
  limitsCapacity(data.componentId, data.category);

export function BulkEditPanel() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const updateSelectedConfig = useTopologyStore((s) => s.updateSelectedConfig);
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

  const limiting = components
    .map((n) => n.data as TopologyNodeData)
    .filter(limitsLoad);
  const capacity = common(limiting.map((d) => d.capacity));
  const instances = common(limiting.map((d) => d.instances));
  const defaults = common(
    limiting.map((d) => defaultCapacity(d.componentId, d.category)),
  );
  const base = defaults.mixed ? undefined : defaults.value;

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
        <div className="mt-5 flex flex-col gap-2">
          {limiting.length > 0 ? (
            <>
              <CapacityField
                idPrefix="bulk"
                base={base}
                capacity={capacity.value}
                capacityMixed={capacity.mixed}
                capacityOverridden={limiting.some(
                  (d) => d.capacity !== undefined,
                )}
                instances={instances.value}
                instancesMixed={instances.mixed}
                onCapacityChange={(value) =>
                  updateSelectedConfig({ capacity: value }, limitsLoad)
                }
                onInstancesChange={(value) =>
                  updateSelectedConfig({ instances: value }, limitsLoad)
                }
              />
              {base === undefined && (
                <p className="text-xs text-muted-foreground">
                  These components have different defaults, so a value here
                  replaces all of them.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {limiting.length === components.length
                  ? `Applies to ${plural(components.length, "component")}.`
                  : `Applies to ${limiting.length} of ${plural(components.length, "component")}. The rest don't limit load.`}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              None of the selected components limit load, so there is no
              capacity to edit.
            </p>
          )}
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
