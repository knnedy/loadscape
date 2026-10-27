"use client";

import { Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { protocolPresets } from "@/lib/catalog/protocols";
import { formatRate } from "@/lib/simulation/capacity";
import { presetFor } from "@/lib/simulation/catalog-presets";
import { PRESETS, type PresetKey } from "@/lib/simulation/presets";
import type { Fanout } from "@/lib/simulation/types";
import { cn } from "@/lib/utils";
import { useTopologyStore } from "../../_store/topology-provider";
import type { NodeConfigPatch } from "../../_store/slices/nodes-slice";
import type { NodeCategory, TopologyNodeData } from "@/lib/types/topology";
import {
  componentCatalog,
  getCategoryDef,
  getAnnotation,
} from "@/lib/catalog/components";
import { BulkEditPanel } from "./bulk-edit-panel";
import { CapacityField } from "./capacity-field";
import { NumberInput } from "./number-input";

type FieldKey =
  | "capacity"
  | "rps"
  | "hitRatio"
  | "buffer"
  | "fanout"
  | "latencyMs"
  | "failRate";

const LAYOUT: Record<PresetKey, { primary: FieldKey[]; advanced: FieldKey[] }> =
  {
    client: { primary: ["rps"], advanced: [] },
    cache: {
      primary: ["capacity", "hitRatio"],
      advanced: ["buffer", "latencyMs", "failRate"],
    },
    loadBalancer: {
      primary: ["capacity", "fanout"],
      advanced: ["latencyMs", "failRate"],
    },
    gateway: {
      primary: ["capacity"],
      advanced: ["buffer", "latencyMs", "failRate"],
    },
    compute: {
      primary: ["capacity"],
      advanced: ["buffer", "latencyMs", "failRate"],
    },
    database: {
      primary: ["capacity", "buffer"],
      advanced: ["latencyMs", "failRate"],
    },
    queue: { primary: ["capacity", "buffer"], advanced: ["failRate"] },
    external: { primary: ["latencyMs", "failRate"], advanced: [] },
  };

const toPercent = (ratio: number) => Math.round(ratio * 1000) / 10;

function CategoryChip({ category }: { category: NodeCategory }) {
  const def = getCategoryDef(category);
  const color = `var(--cat-${category})`;
  return (
    <span
      className="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        background: `color-mix(in oklch, ${color} 16%, transparent)`,
        color,
      }}>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: color }}
      />
      {def.label}
    </span>
  );
}

function EndpointDot({ category }: { category?: NodeCategory }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{
        background: category
          ? `var(--cat-${category})`
          : "var(--muted-foreground)",
      }}
    />
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: number | undefined;
  base: number;
  min: number;
  max?: number;
  step?: number;
  suffix?: string;
  note?: string;
  onChange: (value: number | undefined) => void;
}

function NumberField({
  id,
  label,
  value,
  base,
  min,
  max,
  step,
  suffix = "",
  note,
  onChange,
}: NumberFieldProps) {
  function commit(next: number | undefined) {
    const resolved = next === base ? undefined : next;
    if (resolved === value) return;
    onChange(resolved);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <NumberInput
        id={id}
        value={value}
        min={min}
        max={max}
        step={step}
        placeholder={formatRate(base)}
        onCommit={commit}
        className="font-mono"
      />
      <p className="text-xs text-muted-foreground">
        Default {formatRate(base)}
        {suffix}
        {value !== undefined && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="underline-offset-2 hover:text-foreground hover:underline">
              Reset
            </button>
          </>
        )}
      </p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function FanoutField({
  value,
  base,
  onChange,
}: {
  value: Fanout | undefined;
  base: Fanout;
  onChange: (value: Fanout | undefined) => void;
}) {
  const current = value ?? base;
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Routing</Label>
      <div className="flex gap-1.5">
        {(["all", "split"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option === base ? undefined : option)}
            className={cn(
              "flex-1 rounded-md border px-2 py-1 text-xs transition-colors",
              current === option
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            )}>
            {option === "all" ? "Call all" : "Split"}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {current === "split"
          ? "Each request goes to exactly one connection, chosen by weight."
          : "Each request calls every connection, scaled by its share."}
      </p>
    </div>
  );
}

function NodeConfigFields({
  id,
  data,
}: {
  id: string;
  data: TopologyNodeData;
}) {
  const updateNodeConfig = useTopologyStore((s) => s.updateNodeConfig);
  const key = presetFor(data.componentId, data.category);
  const base = PRESETS[key];
  const layout = LAYOUT[key];
  const set = (patch: NodeConfigPatch) => updateNodeConfig(id, patch);

  function renderField(field: FieldKey) {
    switch (field) {
      case "capacity":
        return (
          <CapacityField
            key={field}
            idPrefix="config"
            base={base.capacity}
            capacity={data.capacity}
            capacityOverridden={data.capacity !== undefined}
            instances={data.instances}
            onCapacityChange={(capacity) => set({ capacity })}
            onInstancesChange={(instances) => set({ instances })}
          />
        );
      case "rps":
        return (
          <NumberField
            key={field}
            id="config-rps"
            label="Requests per second"
            value={data.rps}
            base={base.rps}
            min={0}
            onChange={(rps) => set({ rps })}
          />
        );
      case "hitRatio":
        return (
          <NumberField
            key={field}
            id="config-hit-ratio"
            label="Cache hit ratio (%)"
            value={
              data.hitRatio === undefined ? undefined : toPercent(data.hitRatio)
            }
            base={toPercent(base.hitRatio)}
            min={0}
            max={100}
            step={0.1}
            suffix="%"
            note="Hits are answered here and never reach the next connection."
            onChange={(percent) =>
              set({
                hitRatio: percent === undefined ? undefined : percent / 100,
              })
            }
          />
        );
      case "buffer":
        return (
          <NumberField
            key={field}
            id="config-buffer"
            label="Queue buffer (requests)"
            value={data.buffer}
            base={base.buffer}
            min={0}
            note="Requests that can wait when busy. 0 drops anything over capacity."
            onChange={(buffer) => set({ buffer })}
          />
        );
      case "fanout":
        return (
          <FanoutField
            key={field}
            value={data.fanout}
            base={base.fanout}
            onChange={(fanout) => set({ fanout })}
          />
        );
      case "latencyMs":
        return (
          <NumberField
            key={field}
            id="config-latency"
            label="Latency when idle (ms)"
            value={data.latencyMs}
            base={base.latencyMs}
            min={0}
            onChange={(latencyMs) => set({ latencyMs })}
          />
        );
      case "failRate":
        return (
          <NumberField
            key={field}
            id="config-fail-rate"
            label="Failure rate (%)"
            value={
              data.failRate === undefined ? undefined : toPercent(data.failRate)
            }
            base={toPercent(base.failRate)}
            min={0}
            max={100}
            step={0.1}
            suffix="%"
            note="Share of requests that fail regardless of load."
            onChange={(percent) =>
              set({
                failRate: percent === undefined ? undefined : percent / 100,
              })
            }
          />
        );
    }
  }

  return (
    <>
      <div className="mt-4 flex flex-col gap-4">
        {layout.primary.map(renderField)}
      </div>
      {key === "external" && (
        <p className="mt-4 text-xs text-muted-foreground">
          Doesn&apos;t limit load: it answers every request after its latency.
        </p>
      )}
      {layout.advanced.length > 0 && (
        <details
          open={layout.advanced.some((field) => data[field] !== undefined)}
          className="mt-5 border-t border-border pt-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none hover:text-foreground">
            Advanced
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            {layout.advanced.map(renderField)}
          </div>
        </details>
      )}
    </>
  );
}

export function ConfigPanel() {
  const inspected = useTopologyStore((s) => s.inspected);
  const detailsOpen = useTopologyStore((s) => s.detailsOpen);
  const selectionCount = useTopologyStore(
    (s) =>
      s.nodes.filter((n) => n.selected).length +
      s.edges.filter((e) => e.selected).length,
  );
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const updateEdgeLabel = useTopologyStore((s) => s.updateEdgeLabel);
  const updateEdgeStyle = useTopologyStore((s) => s.updateEdgeStyle);
  const updateEdgeDirection = useTopologyStore((s) => s.updateEdgeDirection);
  const updateEdgeShare = useTopologyStore((s) => s.updateEdgeShare);

  if (selectionCount > 1) return <BulkEditPanel />;

  const node =
    detailsOpen && inspected?.kind === "node"
      ? nodes.find((n) => n.id === inspected.id)
      : undefined;
  const edge =
    detailsOpen && inspected?.kind === "edge"
      ? edges.find((e) => e.id === inspected.id)
      : undefined;

  if (node && node.type === "component") {
    const data = node.data as TopologyNodeData;
    const component = componentCatalog.find((c) => c.id === data.componentId);
    return (
      <aside className="w-70 shrink-0 overflow-y-auto border-l border-border bg-card p-4">
        <CategoryChip category={data.category} />
        <h3 className="mt-2 text-sm font-semibold text-foreground">
          {data.label}
        </h3>
        {component && (
          <p className="mt-1 text-xs text-muted-foreground italic">
            ({getAnnotation(component)})
          </p>
        )}
        <NodeConfigFields id={node.id} data={data} />
      </aside>
    );
  }

  if (edge && edge.data) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    const sourceCategory =
      sourceNode && "category" in sourceNode.data
        ? (sourceNode.data as TopologyNodeData).category
        : undefined;
    const targetCategory =
      targetNode && "category" in targetNode.data
        ? (targetNode.data as TopologyNodeData).category
        : undefined;
    const sourceLabel =
      sourceNode && "label" in sourceNode.data
        ? (sourceNode.data as { label: string }).label
        : edge.source;
    const targetLabel =
      targetNode && "label" in targetNode.data
        ? (targetNode.data as { label: string }).label
        : edge.target;

    const sourceData =
      sourceNode?.type === "component"
        ? (sourceNode.data as TopologyNodeData)
        : undefined;
    const sourceFanout: Fanout = sourceData
      ? (sourceData.fanout ??
        PRESETS[presetFor(sourceData.componentId, sourceData.category)].fanout)
      : "all";
    const splits = sourceFanout === "split";

    return (
      <aside className="w-70 shrink-0 overflow-y-auto border-l border-border bg-card p-4">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <Link2 size={11} />
          Connection
        </span>
        <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <EndpointDot category={sourceCategory} />
          <span className="truncate">{sourceLabel}</span>
          <span className="shrink-0 text-muted-foreground">→</span>
          <EndpointDot category={targetCategory} />
          <span className="truncate">{targetLabel}</span>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="edge-label" className="text-xs">
            Label
          </Label>
          <Input
            id="edge-label"
            value={edge.data.label ?? ""}
            onChange={(e) => updateEdgeLabel(edge.id, e.target.value)}
            placeholder="e.g. HTTP, async"
          />
          <div className="mt-1 flex flex-wrap gap-1">
            {protocolPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => updateEdgeLabel(edge.id, preset)}
                className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="text-xs">Style</Label>
          <div className="flex gap-1.5">
            {(["sync", "async"] as const).map((style) => (
              <button
                key={style}
                onClick={() => updateEdgeStyle(edge.id, style)}
                className={`flex-1 rounded-md border px-2 py-1 text-xs capitalize transition-colors ${
                  edge.data!.style === style
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}>
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-1.5">
          <Label className="text-xs">Direction</Label>
          <div className="flex gap-1.5">
            {(["forward", "bidirectional", "none"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => updateEdgeDirection(edge.id, dir)}
                className={`flex-1 rounded-md border px-2 py-1 text-[11px] capitalize transition-colors ${
                  edge.data!.direction === dir
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent"
                }`}>
                {dir}
              </button>
            ))}
          </div>
        </div>

        {sourceData && (
          <div className="mt-4">
            <NumberField
              id="edge-share"
              label={splits ? "Weight" : "Chance per request"}
              value={edge.data.share}
              base={1}
              min={0}
              max={1}
              step={0.01}
              note={
                splits
                  ? "Relative weight among this component's connections."
                  : "Share of requests that call this connection."
              }
              onChange={(share) => updateEdgeShare(edge.id, share)}
            />
          </div>
        )}
      </aside>
    );
  }

  return null;
}
