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
      "The caller blocks on the response, so failures at the target fail the caller's request too.",
  },
  {
    value: "async",
    label: "Async",
    description:
      "Fire-and-forget. Requests dropped by the target are lost silently.",
  },
];

const DIRECTION_OPTIONS: SegmentOption<EdgeDirection>[] = [
  {
    value: "forward",
    label: "Forward",
    description:
      "Arrowhead at the target. Rendering only: requests always flow source → target.",
  },
  {
    value: "bidirectional",
    label: "Both ends",
    description:
      "Arrowheads at both ends. Rendering only: requests always flow source → target.",
  },
  {
    value: "none",
    label: "None",
    description:
      "No arrowheads. Rendering only: requests always flow source → target.",
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
    selectedEdges.length > 0 && plural(selectedEdges.length, "edge"),
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
        Edits apply to every selected item as a single undo step.
      </p>

      {components.length > 0 && (
        <Section title="Capacity">
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
                  The selected components have different default capacities, so
                  a typed value overrides all of them.
                </Callout>
              )}
              <p className="text-xs text-muted-foreground">
                {limiting.length === components.length
                  ? `Applies to ${plural(components.length, "component")}.`
                  : `Applies to ${limiting.length} of ${plural(components.length, "component")}; the rest are not capacity-limited.`}
              </p>
            </>
          ) : (
            <Callout>
              None of the selected components are capacity-limited, so there is
              nothing to edit.
            </Callout>
          )}
        </Section>
      )}

      {selectedEdges.length > 0 && (
        <>
          <Section title="Invocation">
            <Segmented
              label="Call style"
              value={style.value}
              mixed={style.mixed}
              options={STYLE_OPTIONS}
              onChange={(next) => updateSelectedEdges({ style: next })}
            />
          </Section>
          <Section title="Arrowheads">
            <Segmented
              label="Arrowheads"
              value={direction.value}
              mixed={direction.mixed}
              options={DIRECTION_OPTIONS}
              onChange={(next) => updateSelectedEdges({ direction: next })}
            />
            <p className="text-xs text-muted-foreground">
              Applies to {plural(selectedEdges.length, "edge")}.
            </p>
          </Section>
          <div className="mt-4">
            <Callout>
              Retry policy and call probability are per edge. Select a single
              edge to change them.
            </Callout>
          </div>
        </>
      )}

      {components.length === 0 && selectedEdges.length === 0 && (
        <div className="mt-5">
          <Callout>
            Select components or edges to edit them together. Groups and notes
            have no shared settings.
          </Callout>
        </div>
      )}
    </aside>
  );
}
