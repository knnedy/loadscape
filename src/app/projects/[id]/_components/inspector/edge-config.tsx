"use client";

import { Link2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { protocolPresets } from "@/lib/catalog/protocols";
import { formatRate } from "@/lib/simulation/capacity";
import { presetFor } from "@/lib/simulation/catalog-presets";
import { PRESETS } from "@/lib/simulation/presets";
import type { Fanout } from "@/lib/simulation/types";
import type {
  EdgeDirection,
  EdgeStyle,
  NodeCategory,
  TopologyNodeData,
} from "@/lib/types/topology";
import { useTopologyStore } from "../../_store/topology-provider";
import {
  Callout,
  Field,
  Section,
  Segmented,
  Stepper,
  UnitInput,
  toPercent,
  type SegmentOption,
} from "./field-parts";

const DEFAULT_BACKOFF_MS = 100;

const STYLE_OPTIONS: SegmentOption<EdgeStyle>[] = [
  {
    value: "sync",
    label: "Sync",
    description:
      "The caller waits for the answer. If the target fails or drops the request, the caller's request fails too, and the work it already did is wasted.",
  },
  {
    value: "async",
    label: "Async",
    description:
      "The caller sends the request and moves on. If the target drops it, that is lost silently: it shows in the run summary but does not hurt the caller.",
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

function backoffText(backoff: number, retries: number) {
  const waits = Array.from(
    { length: retries },
    (_, i) => `${formatRate(backoff * 2 ** i)} ms`,
  );
  const sentence =
    retries === 1
      ? `Waits ${waits[0]} before retrying.`
      : `Waits ${waits.join(", then ")} before each retry.`;
  return backoff < DEFAULT_BACKOFF_MS
    ? `${sentence} The simulation works in 100 ms steps, so shorter waits count as 100 ms.`
    : sentence;
}

export function EdgeConfig({ id }: { id: string }) {
  const edge = useTopologyStore((s) => s.edges.find((e) => e.id === id));
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const updateEdgeLabel = useTopologyStore((s) => s.updateEdgeLabel);
  const updateEdgeStyle = useTopologyStore((s) => s.updateEdgeStyle);
  const updateEdgeDirection = useTopologyStore((s) => s.updateEdgeDirection);
  const updateEdgeShare = useTopologyStore((s) => s.updateEdgeShare);
  const updateEdgeRetry = useTopologyStore((s) => s.updateEdgeRetry);

  if (!edge?.data) return null;
  const data = edge.data;

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
  const sourcePreset = sourceData
    ? PRESETS[presetFor(sourceData.componentId, sourceData.category)]
    : undefined;
  const fanout: Fanout = sourceData?.fanout ?? sourcePreset?.fanout ?? "all";
  const splits = fanout === "split";
  const fromQueue = sourcePreset?.role === "queue";
  const isAsync = data.style === "async" || fromQueue;

  const weights = edges
    .filter((e) => e.source === edge.source)
    .map((e) => e.data?.share ?? 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const portion =
    totalWeight > 0 ? Math.round(((data.share ?? 1) / totalWeight) * 100) : 0;

  const retries = data.retries ?? 0;
  const backoff = data.backoffMs ?? DEFAULT_BACKOFF_MS;

  const summary = fromQueue
    ? `${sourceLabel} hands requests on to ${targetLabel} without waiting for an answer.`
    : isAsync
      ? `${sourceLabel} sends requests to ${targetLabel} and moves on without waiting.`
      : `${sourceLabel} waits for ${targetLabel} to answer.`;

  return (
    <>
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
      <p className="mt-3 rounded-lg bg-muted/50 px-2.5 py-2 text-xs leading-snug text-foreground">
        {summary}
      </p>

      <Section title="How it is called">
        {fromQueue ? (
          <Callout>
            Connections leaving a queue always behave as async: the queue hands
            requests on without waiting for the answer.
          </Callout>
        ) : (
          <Segmented
            label="Call style"
            value={data.style}
            options={STYLE_OPTIONS}
            onChange={(style) => updateEdgeStyle(id, style)}
          />
        )}
      </Section>

      {sourceData && (
        <Section title="Traffic">
          {splits ? (
            <Field
              id="edge-share"
              label="Weight"
              hint={`Gets about ${portion}% of ${sourceLabel}'s requests, compared with its other connections. A higher weight means more traffic.`}
              changed={data.share !== undefined}
              onReset={() => updateEdgeShare(id, undefined)}>
              <UnitInput
                id="edge-share"
                value={data.share}
                base={1}
                unit="weight"
                min={0}
                max={1}
                step={0.01}
                onChange={(share) => updateEdgeShare(id, share)}
              />
            </Field>
          ) : (
            <Field
              id="edge-share"
              label="Used by"
              hint="Share of requests that call this connection. 100% means every request; a lower share suits occasional calls, like payments."
              changed={data.share !== undefined}
              onReset={() => updateEdgeShare(id, undefined)}>
              <UnitInput
                id="edge-share"
                value={
                  data.share === undefined ? undefined : toPercent(data.share)
                }
                base={100}
                unit="%"
                min={0}
                max={100}
                step={0.1}
                onChange={(percent) =>
                  updateEdgeShare(
                    id,
                    percent === undefined ? undefined : percent / 100,
                  )
                }
              />
            </Field>
          )}
        </Section>
      )}

      <Section title="Retries">
        {isAsync ? (
          <Callout>
            Retries only apply to sync connections. With async, the caller never
            finds out about a failure, so there is nothing to retry.
          </Callout>
        ) : (
          <>
            <Field
              id="edge-retries"
              label="Retry failed calls"
              hint={
                retries === 0
                  ? "Off: a failed call just fails."
                  : `Up to ${retries} more ${retries === 1 ? "attempt" : "attempts"} after a failure.`
              }
              changed={data.retries !== undefined}
              onReset={() => updateEdgeRetry(id, { retries: undefined })}>
              <Stepper
                id="edge-retries"
                value={retries}
                min={0}
                max={5}
                decrementLabel="Fewer retries"
                incrementLabel="More retries"
                onChange={(next) =>
                  updateEdgeRetry(id, { retries: next ? next : undefined })
                }
              />
            </Field>
            {retries > 0 && (
              <>
                <Field
                  id="edge-backoff"
                  label="Wait before the first retry"
                  hint={backoffText(backoff, retries)}
                  changed={data.backoffMs !== undefined}
                  onReset={() => updateEdgeRetry(id, { backoffMs: undefined })}>
                  <UnitInput
                    id="edge-backoff"
                    value={data.backoffMs}
                    base={DEFAULT_BACKOFF_MS}
                    unit="ms"
                    min={0}
                    max={5000}
                    onChange={(backoffMs) => updateEdgeRetry(id, { backoffMs })}
                  />
                </Field>
                <Callout tone="warning">
                  Each retry is extra load on {targetLabel}. If it is already
                  struggling, retries can push it further over (a retry storm).
                </Callout>
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Appearance">
        <Field
          id="edge-label"
          label="Label"
          hint="Text shown on the line, such as the protocol.">
          <Input
            id="edge-label"
            value={data.label ?? ""}
            onChange={(e) => updateEdgeLabel(id, e.target.value)}
            placeholder="e.g. HTTP, gRPC"
          />
          <div className="flex flex-wrap gap-1">
            {protocolPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => updateEdgeLabel(id, preset)}
                className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
                {preset}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Arrows">
          <Segmented
            label="Arrow direction"
            value={data.direction}
            options={DIRECTION_OPTIONS}
            onChange={(direction) => updateEdgeDirection(id, direction)}
          />
        </Field>
      </Section>
    </>
  );
}
