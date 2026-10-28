"use client";

import { ChevronDown } from "lucide-react";
import {
  componentCatalog,
  getAnnotation,
  getCategoryDef,
} from "@/lib/catalog/components";
import { formatRate } from "@/lib/simulation/capacity";
import { presetFor } from "@/lib/simulation/catalog-presets";
import { PRESETS, type PresetKey } from "@/lib/simulation/presets";
import type { Fanout } from "@/lib/simulation/types";
import type { NodeCategory, TopologyNodeData } from "@/lib/types/topology";
import type { NodeConfigPatch } from "../../_store/slices/nodes-slice";
import { useTopologyStore } from "../../_store/topology-provider";
import { CapacityField } from "./capacity-field";
import {
  Field,
  Section,
  Segmented,
  UnitInput,
  toPercent,
  type SegmentOption,
} from "./field-parts";

type FieldKey =
  | "capacity"
  | "rps"
  | "hitRatio"
  | "buffer"
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
] as const;

const FIELD_KEYS: Record<FieldKey, readonly (typeof OVERRIDE_KEYS)[number][]> =
  {
    capacity: ["capacity", "instances"],
    rps: ["rps"],
    hitRatio: ["hitRatio"],
    buffer: ["buffer"],
    fanout: ["fanout"],
    latencyMs: ["latencyMs"],
    failRate: ["failRate"],
  };

interface Layout {
  sections: { title: string; fields: FieldKey[] }[];
  advanced: FieldKey[];
}

const SERVICE_LAYOUT: Layout = {
  sections: [{ title: "Load", fields: ["capacity"] }],
  advanced: ["buffer", "latencyMs", "failRate"],
};

const LAYOUT: Record<PresetKey, Layout> = {
  client: {
    sections: [{ title: "Traffic", fields: ["rps"] }],
    advanced: [],
  },
  cache: {
    sections: [
      { title: "Load", fields: ["capacity"] },
      { title: "Behaviour", fields: ["hitRatio"] },
    ],
    advanced: ["buffer", "latencyMs", "failRate"],
  },
  loadBalancer: {
    sections: [
      { title: "Load", fields: ["capacity"] },
      { title: "Behaviour", fields: ["fanout"] },
    ],
    advanced: ["latencyMs", "failRate"],
  },
  gateway: SERVICE_LAYOUT,
  compute: SERVICE_LAYOUT,
  database: {
    sections: [{ title: "Load", fields: ["capacity", "buffer"] }],
    advanced: ["latencyMs", "failRate"],
  },
  queue: {
    sections: [{ title: "Load", fields: ["capacity", "buffer"] }],
    advanced: ["failRate"],
  },
  external: {
    sections: [{ title: "Behaviour", fields: ["latencyMs", "failRate"] }],
    advanced: [],
  },
};

const FANOUT_OPTIONS: SegmentOption<Fanout>[] = [
  {
    value: "all",
    label: "Call every one",
    description:
      "Each request calls every connection, scaled by its share. Like an API calling a database and a payment service.",
  },
  {
    value: "split",
    label: "Pick one",
    description:
      "Each request goes to exactly one connection, chosen by weight. Like a load balancer spreading traffic.",
  },
];

function describe(
  key: PresetKey,
  data: TopologyNodeData,
  base: (typeof PRESETS)[PresetKey],
): string {
  const total = (data.capacity ?? base.capacity) * (data.instances ?? 1);
  const buffer = data.buffer ?? base.buffer;
  const latency = data.latencyMs ?? base.latencyMs;
  const hit = toPercent(data.hitRatio ?? base.hitRatio);
  const fail = toPercent(data.failRate ?? base.failRate);
  const fanout = data.fanout ?? base.fanout;

  switch (key) {
    case "client":
      return `Sends ${formatRate(data.rps ?? base.rps)} requests per second into the system. Everything else is measured against this.`;
    case "cache":
      return `Answers ${hit}% of requests itself and passes the rest on, up to ${formatRate(total)} per second.`;
    case "loadBalancer":
      return fanout === "split"
        ? `Spreads requests across its connections, up to ${formatRate(total)} per second.`
        : `Sends every request to all of its connections, up to ${formatRate(total)} per second.`;
    case "gateway":
      return `Passes every request on after ${formatRate(latency)} ms, up to ${formatRate(total)} per second.`;
    case "compute":
      return `Does the work for up to ${formatRate(total)} requests per second, then calls each of its connections.`;
    case "database":
      return buffer > 0
        ? `Serves up to ${formatRate(total)} requests per second. Up to ${formatRate(buffer)} more can wait; anything beyond that is dropped.`
        : `Serves up to ${formatRate(total)} requests per second. Anything beyond that is dropped.`;
    case "queue":
      return `Holds up to ${formatRate(buffer)} waiting requests and hands them on at ${formatRate(total)} per second. When it is full, new requests are turned away.`;
    case "external":
      return `A third-party service with no capacity limit. It answers every request after ${formatRate(latency)} ms${fail > 0 ? ` and fails ${fail}% of them` : ""}.`;
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
            capacityLabel={isQueue ? "Processing speed" : undefined}
            capacityHint={
              isQueue
                ? "Requests per second the queue hands on. Faster than new requests arrive and it stays empty; slower and it fills up."
                : undefined
            }
            instancesLabel={isQueue ? "Consumers" : undefined}
            instancesHint={
              isQueue
                ? "Workers pulling from the queue. Total speed is processing speed times consumers."
                : undefined
            }
            onCapacityChange={(capacity) => set({ capacity })}
            onInstancesChange={(instances) => set({ instances })}
          />
        );
      case "rps":
        return (
          <Field
            key={field}
            id="config-rps"
            label="Traffic generated"
            hint="Requests per second this client sends."
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
            label="Cache hit rate"
            hint="Share of requests answered right here. Hits never reach the next component."
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
            label={isQueue ? "Queue size" : "Waiting line"}
            hint={
              isQueue
                ? "How many requests the queue can hold. When it is full, new requests are turned away."
                : "How many requests can wait when it is busy. At 0, anything over capacity is dropped straight away."
            }
            changed={data.buffer !== undefined}
            onReset={() => set({ buffer: undefined })}>
            <UnitInput
              id="config-buffer"
              value={data.buffer}
              base={base.buffer}
              unit="requests"
              min={0}
              onChange={(buffer) => set({ buffer })}
            />
          </Field>
        );
      case "fanout":
        return (
          <Field
            key={field}
            label="With several connections"
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
            label="Response time"
            hint="How long one request takes when it is not busy. It stretches as load nears capacity."
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
            label="Random failures"
            hint="Requests that fail even when it is idle, like a flaky dependency."
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
      <p className="mt-3 rounded-lg bg-muted/50 px-2.5 py-2 text-xs leading-snug text-foreground">
        {describe(key, data, base)}
      </p>

      {changed.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {changed.length} {changed.length === 1 ? "setting" : "settings"}{" "}
            changed
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
