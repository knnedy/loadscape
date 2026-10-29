"use client";

import { ChevronDown } from "lucide-react";
import {
  componentCatalog,
  getAnnotation,
  getCategoryDef,
} from "@/lib/catalog/components";
import { formatRateCompact } from "@/lib/simulation/capacity";
import { presetFor } from "@/lib/simulation/catalog-presets";
import { PRESETS, type PresetKey } from "@/lib/simulation/presets";
import type { Fanout } from "@/lib/simulation/types";
import type { NodeCategory, TopologyNodeData } from "@/lib/types/topology";
import type { NodeConfigPatch } from "../../_store/slices/nodes-slice";
import { useTopologyStore } from "../../_store/topology-provider";
import { CapacityField } from "./capacity-field";
import {
  Callout,
  Field,
  Section,
  Segmented,
  SpecStrip,
  UnitInput,
  toPercent,
  type SegmentOption,
  type SpecItem,
} from "./field-parts";

type FieldKey =
  | "capacity"
  | "rps"
  | "hitRatio"
  | "buffer"
  | "timeoutMs"
  | "fanout"
  | "latencyMs"
  | "failRate";

const OVERRIDE_KEYS = [
  "capacity",
  "instances",
  "buffer",
  "hitRatio",
  "fanout",
  "latencyMs",
  "failRate",
  "rps",
  "timeoutMs",
] as const;

const FIELD_KEYS: Record<FieldKey, readonly (typeof OVERRIDE_KEYS)[number][]> =
  {
    capacity: ["capacity", "instances"],
    rps: ["rps"],
    hitRatio: ["hitRatio"],
    buffer: ["buffer"],
    timeoutMs: ["timeoutMs"],
    fanout: ["fanout"],
    latencyMs: ["latencyMs"],
    failRate: ["failRate"],
  };

interface Layout {
  sections: { title: string; fields: FieldKey[] }[];
  advanced: FieldKey[];
}

const SERVICE_LAYOUT: Layout = {
  sections: [{ title: "Capacity", fields: ["capacity"] }],
  advanced: ["buffer", "timeoutMs", "latencyMs", "failRate"],
};

const QUEUEING_LAYOUT: Layout["sections"] = [
  { title: "Capacity", fields: ["capacity"] },
  { title: "Queueing", fields: ["buffer", "timeoutMs"] },
];

const LAYOUT: Record<PresetKey, Layout> = {
  client: {
    sections: [{ title: "Traffic", fields: ["rps"] }],
    advanced: [],
  },
  cache: {
    sections: [
      { title: "Capacity", fields: ["capacity"] },
      { title: "Behaviour", fields: ["hitRatio"] },
    ],
    advanced: ["buffer", "timeoutMs", "latencyMs", "failRate"],
  },
  loadBalancer: {
    sections: [
      { title: "Capacity", fields: ["capacity"] },
      { title: "Routing", fields: ["fanout"] },
    ],
    advanced: ["latencyMs", "failRate"],
  },
  gateway: SERVICE_LAYOUT,
  compute: SERVICE_LAYOUT,
  database: { sections: QUEUEING_LAYOUT, advanced: ["latencyMs", "failRate"] },
  queue: { sections: QUEUEING_LAYOUT, advanced: ["failRate"] },
  external: {
    sections: [{ title: "Behaviour", fields: ["latencyMs", "failRate"] }],
    advanced: [],
  },
};

const FANOUT_OPTIONS: SegmentOption<Fanout>[] = [
  {
    value: "all",
    label: "Fan-out",
    description:
      "Each request invokes every outgoing edge, scaled by its call probability. Like an API calling a database and a payment provider.",
  },
  {
    value: "split",
    label: "Weighted",
    description:
      "Each request is routed to exactly one outgoing edge, chosen by weight. Like a load balancer.",
  },
];

function formatDuration(ms: number) {
  if (ms >= 1000) return `${Math.round(ms / 100) / 10} s`;
  return `${Math.round(ms * 10) / 10} ms`;
}

function specsFor(
  key: PresetKey,
  data: TopologyNodeData,
  base: (typeof PRESETS)[PresetKey],
): SpecItem[] {
  const total = (data.capacity ?? base.capacity) * (data.instances ?? 1);
  const buffer = data.buffer ?? base.buffer;
  const latency = data.latencyMs ?? base.latencyMs;
  const timeout = data.timeoutMs ?? base.timeoutMs;
  const routing =
    (data.fanout ?? base.fanout) === "split" ? "weighted" : "fan-out";

  const capacity: SpecItem = {
    label: key === "queue" ? "Drain rate" : "Capacity",
    value: `${formatRateCompact(total)}/s`,
  };
  const latencyItem: SpecItem = {
    label: "Latency",
    value: formatDuration(latency),
  };
  const bufferItem: SpecItem = {
    label: key === "queue" ? "Max depth" : "Buffer",
    value: formatRateCompact(buffer),
    tone: buffer > 0 ? "default" : "muted",
  };
  const timeoutItem: SpecItem = {
    label: key === "queue" ? "TTL" : "Timeout",
    value: timeout > 0 ? formatDuration(timeout) : "off",
    tone: timeout > 0 ? "default" : "muted",
  };

  switch (key) {
    case "client":
      return [
        {
          label: "Rate",
          value: `${formatRateCompact(data.rps ?? base.rps)}/s`,
        },
        { label: "Routing", value: routing },
      ];
    case "cache":
      return [
        capacity,
        {
          label: "Hit ratio",
          value: `${toPercent(data.hitRatio ?? base.hitRatio)}%`,
        },
        latencyItem,
      ];
    case "loadBalancer":
      return [capacity, { label: "Routing", value: routing }, latencyItem];
    case "gateway":
    case "compute":
      return [capacity, latencyItem, bufferItem];
    case "database":
      return [capacity, bufferItem, timeoutItem];
    case "queue":
      return [capacity, bufferItem, timeoutItem];
    case "external":
      return [
        latencyItem,
        {
          label: "Error rate",
          value: `${toPercent(data.failRate ?? base.failRate)}%`,
        },
      ];
  }
}

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

export function NodeConfig({ id }: { id: string }) {
  const node = useTopologyStore((s) => s.nodes.find((n) => n.id === id));
  const updateNodeConfig = useTopologyStore((s) => s.updateNodeConfig);

  if (!node || node.type !== "component") return null;

  const data = node.data as TopologyNodeData;
  const key = presetFor(data.componentId, data.category);
  const base = PRESETS[key];
  const layout = LAYOUT[key];
  const component = componentCatalog.find((c) => c.id === data.componentId);
  const isQueue = base.role === "queue";

  const set = (patch: NodeConfigPatch) => updateNodeConfig(id, patch);
  const changed = OVERRIDE_KEYS.filter((k) => data[k] !== undefined);
  const advancedChanged = layout.advanced.some((field) =>
    FIELD_KEYS[field].some((k) => data[k] !== undefined),
  );

  function resetAll() {
    set(
      Object.fromEntries(
        OVERRIDE_KEYS.map((k) => [k, undefined]),
      ) as NodeConfigPatch,
    );
  }

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
            capacityLabel={isQueue ? "Drain rate" : undefined}
            capacityHint={
              isQueue
                ? "Messages delivered downstream per second, per consumer. Below the arrival rate, depth grows until the buffer is full."
                : undefined
            }
            instancesLabel={isQueue ? "Consumers" : undefined}
            instancesHint={
              isQueue
                ? "Parallel consumers. Total drain rate = drain rate × consumers."
                : undefined
            }
            totalLabel={isQueue ? "Total drain rate" : undefined}
            onCapacityChange={(capacity) => set({ capacity })}
            onInstancesChange={(instances) => set({ instances })}
          />
        );
      case "rps":
        return (
          <Field
            key={field}
            id="config-rps"
            label="Request rate"
            hint="Open-loop arrival rate generated by this client."
            changed={data.rps !== undefined}
            onReset={() => set({ rps: undefined })}>
            <UnitInput
              id="config-rps"
              value={data.rps}
              base={base.rps}
              unit="req/s"
              min={0}
              onChange={(rps) => set({ rps })}
            />
          </Field>
        );
      case "hitRatio":
        return (
          <Field
            key={field}
            id="config-hit-ratio"
            label="Hit ratio"
            hint="Fraction of requests served from cache. Hits are not forwarded downstream."
            changed={data.hitRatio !== undefined}
            onReset={() => set({ hitRatio: undefined })}>
            <UnitInput
              id="config-hit-ratio"
              value={
                data.hitRatio === undefined
                  ? undefined
                  : toPercent(data.hitRatio)
              }
              base={toPercent(base.hitRatio)}
              unit="%"
              min={0}
              max={100}
              step={0.1}
              onChange={(percent) =>
                set({
                  hitRatio: percent === undefined ? undefined : percent / 100,
                })
              }
            />
          </Field>
        );
      case "buffer":
        return (
          <Field
            key={field}
            id="config-buffer"
            label={isQueue ? "Max depth" : "Buffer"}
            hint={
              isQueue
                ? "Maximum messages held. When full, new messages are rejected."
                : "Requests that can queue while all instances are busy. At 0, excess load is shed immediately."
            }
            changed={data.buffer !== undefined}
            onReset={() => set({ buffer: undefined })}>
            <UnitInput
              id="config-buffer"
              value={data.buffer}
              base={base.buffer}
              unit={isQueue ? "messages" : "requests"}
              min={0}
              onChange={(buffer) => set({ buffer })}
            />
          </Field>
        );
      case "timeoutMs": {
        const buffered = (data.buffer ?? base.buffer) > 0;
        return (
          <div key={field} className="flex flex-col gap-2">
            <Field
              id="config-timeout"
              label={isQueue ? "Message TTL" : "Queue timeout"}
              hint={
                isQueue
                  ? "Messages older than this are discarded before delivery. Producers are not notified, so goodput is unaffected. 0 disables."
                  : "Requests queued longer than this fail with a timeout and the caller sees the error. 0 disables."
              }
              changed={data.timeoutMs !== undefined}
              onReset={() => set({ timeoutMs: undefined })}>
              <UnitInput
                id="config-timeout"
                value={data.timeoutMs}
                base={base.timeoutMs}
                unit="ms"
                min={0}
                max={60_000}
                onChange={(timeoutMs) => set({ timeoutMs })}
              />
            </Field>
            {!buffered && (
              <Callout tone="warning">
                No effect while the buffer is 0: nothing queues, so nothing can
                time out.
              </Callout>
            )}
          </div>
        );
      }
      case "fanout":
        return (
          <Field
            key={field}
            label="Routing"
            changed={data.fanout !== undefined}
            onReset={() => set({ fanout: undefined })}>
            <Segmented
              label="Routing"
              value={data.fanout ?? base.fanout}
              options={FANOUT_OPTIONS}
              onChange={(fanout) =>
                set({ fanout: fanout === base.fanout ? undefined : fanout })
              }
            />
          </Field>
        );
      case "latencyMs":
        return (
          <Field
            key={field}
            id="config-latency"
            label="Idle latency"
            hint="Service time at zero load. Latency grows as utilization approaches capacity."
            changed={data.latencyMs !== undefined}
            onReset={() => set({ latencyMs: undefined })}>
            <UnitInput
              id="config-latency"
              value={data.latencyMs}
              base={base.latencyMs}
              unit="ms"
              min={0}
              onChange={(latencyMs) => set({ latencyMs })}
            />
          </Field>
        );
      case "failRate":
        return (
          <Field
            key={field}
            id="config-fail-rate"
            label="Error rate"
            hint="Fraction of requests that fail regardless of load."
            changed={data.failRate !== undefined}
            onReset={() => set({ failRate: undefined })}>
            <UnitInput
              id="config-fail-rate"
              value={
                data.failRate === undefined
                  ? undefined
                  : toPercent(data.failRate)
              }
              base={toPercent(base.failRate)}
              unit="%"
              min={0}
              max={100}
              step={0.1}
              onChange={(percent) =>
                set({
                  failRate: percent === undefined ? undefined : percent / 100,
                })
              }
            />
          </Field>
        );
    }
  }

  return (
    <>
      <CategoryChip category={data.category} />
      <h3 className="mt-2 text-sm font-semibold text-foreground">
        {data.label}
      </h3>
      {component && (
        <p className="mt-0.5 text-xs text-muted-foreground italic">
          ({getAnnotation(component)})
        </p>
      )}

      <SpecStrip items={specsFor(key, data, base)} />

      {changed.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {changed.length} {changed.length === 1 ? "override" : "overrides"}
          </span>
          <button
            type="button"
            onClick={resetAll}
            className="underline-offset-2 hover:text-foreground hover:underline">
            Reset all
          </button>
        </div>
      )}

      {layout.sections.map((section) => (
        <Section key={section.title} title={section.title}>
          {section.fields.map(renderField)}
        </Section>
      ))}

      {layout.advanced.length > 0 && (
        <details
          open={advancedChanged}
          className="group mt-5 border-t border-border pt-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-[11px] font-semibold tracking-wide text-muted-foreground uppercase select-none hover:text-foreground [&::-webkit-details-marker]:hidden">
            Advanced
            <ChevronDown
              size={12}
              className="transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            {layout.advanced.map(renderField)}
          </div>
        </details>
      )}
    </>
  );
}
