"use client";

import { useMemo } from "react";
import { defaultCapacity, limitsCapacity } from "@/lib/simulation/capacity";
import type {
  EdgeDirection,
  EdgeStyle,
  TopologyNodeData,
} from "@/lib/types/topology";
import { useTopologyStore } from "../../_store/topology-provider";
import { CapacityField } from "./capacity-field";
import { Callout, Section, Segmented, type SegmentOption } from "./field-parts";

const STYLE_OPTIONS: SegmentOption<EdgeStyle>[] = [
  {
    value: "sync",
    label: "Sync",
    description:
      "The caller waits for the answer, so a failure at the target fails the caller's request too.",
  },
  {
    value: "async",
    label: "Async",
    description:
      "The caller sends and moves on. Requests the target drops are lost silently.",
  },
];

const DIRECTION_OPTIONS: SegmentOption<EdgeDirection>[] = [
  {
    value: "forward",
    label: "Forward",
    description:
      "Arrow points at the target. Drawing only: it does not change how traffic flows.",
  },
  {
    value: "bidirectional",
    label: "Both ways",
    description:
      "Arrows at both ends. Drawing only: requests still flow from source to target.",
  },
  {
    value: "none",
    label: "No arrow",
    description:
      "No arrows. Drawing only: requests still flow from source to target.",
  },
];

function plural(count: number, word: string) {
  return `${count} ${count === 1 ? word : `${word}s`}`;
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

  const style = common(selectedEdges.map((e) => e.data?.style));
  const direction = common(selectedEdges.map((e) => e.data?.direction));

  return (
    <aside className="w-70 shrink-0 overflow-y-auto border-l border-border bg-card p-4">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        {total} selected
      </span>
      <p className="mt-2 text-sm text-foreground">{summary}</p>
      <p className="mt-1 text-xs leading-snug text-muted-foreground">
        Changes here apply to everything selected, in one step you can undo.
      </p>

      {components.length > 0 && (
        <Section title="Load">
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
                <Callout>
                  These components have different defaults, so a capacity typed
                  here replaces all of them.
                </Callout>
              )}
              <p className="text-xs text-muted-foreground">
                {limiting.length === components.length
                  ? `Applies to ${plural(components.length, "component")}.`
                  : `Applies to ${limiting.length} of ${plural(components.length, "component")}. The rest don't limit load.`}
              </p>
            </>
          ) : (
            <Callout>
              None of the selected components limit load, so there is no
              capacity to edit.
            </Callout>
          )}
        </Section>
      )}

      {selectedEdges.length > 0 && (
        <>
          <Section title="How they are called">
            <Segmented
              label="Call style"
              value={style.value}
              mixed={style.mixed}
              options={STYLE_OPTIONS}
              onChange={(next) => updateSelectedEdges({ style: next })}
            />
          </Section>
          <Section title="Arrows">
            <Segmented
              label="Arrow direction"
              value={direction.value}
              mixed={direction.mixed}
              options={DIRECTION_OPTIONS}
              onChange={(next) => updateSelectedEdges({ direction: next })}
            />
            <p className="text-xs text-muted-foreground">
              Applies to {plural(selectedEdges.length, "connection")}.
            </p>
          </Section>
          <div className="mt-4">
            <Callout>
              Retries and traffic share are set one connection at a time. Select
              a single connection to change them.
            </Callout>
          </div>
        </>
      )}

      {components.length === 0 && selectedEdges.length === 0 && (
        <div className="mt-5">
          <Callout>
            Select components or connections to edit them together. Groups and
            notes have no settings to share.
          </Callout>
        </div>
      )}
    </aside>
  );
}
