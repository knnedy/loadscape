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
  SpecStrip,
  Stepper,
  UnitInput,
  toPercent,
  type SegmentOption,
} from "./field-parts";

const DEFAULT_BACKOFF_MS = 100;
const DEFAULT_COOLDOWN_MS = 5000;

const STYLE_OPTIONS: SegmentOption<EdgeStyle>[] = [
  {
    value: "sync",
    label: "Sync",
    description:
      "The caller blocks on the response. Errors, drops and timeouts at the target propagate to the caller, and the work it already did is wasted.",
  },
  {
    value: "async",
    label: "Async",
    description:
      "Fire-and-forget. The caller succeeds once the hand-off is accepted. Drops at the target are silent loss: reported separately and not counted against goodput.",
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
  const delays = Array.from(
    { length: retries },
    (_, i) => `${formatRate(backoff * 2 ** i)} ms`,
  ).join(", ");
  const text = `Delays: ${delays}. Exponential, ×2 per attempt.`;
  return backoff < DEFAULT_BACKOFF_MS
    ? `${text} Resolution is 100 ms, one simulation tick.`
    : text;
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
  const updateEdgeBreaker = useTopologyStore((s) => s.updateEdgeBreaker);

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
  const retrying = retries > 0 && !isAsync;

  const threshold = data.breakerThreshold ?? 0;
  const breaking = threshold > 0 && !isAsync;

  return (
    <>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <Link2 size={11} />
        Edge
      </span>
      <div className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <EndpointDot category={sourceCategory} />
        <span className="truncate">{sourceLabel}</span>
        <span className="shrink-0 text-muted-foreground">→</span>
        <EndpointDot category={targetCategory} />
        <span className="truncate">{targetLabel}</span>
      </div>

      <SpecStrip
        items={[
          { label: "Mode", value: isAsync ? "async" : "sync" },
          splits
            ? { label: "Share", value: `${portion}%` }
            : { label: "Calls", value: `${toPercent(data.share ?? 1)}%` },
          {
            label: "Retry",
            value: retrying ? `${retries}×` : "off",
            tone: retrying ? "default" : "muted",
          },
          {
            label: "Breaker",
            value: breaking ? `${toPercent(threshold)}%` : "off",
            tone: breaking ? "default" : "muted",
          },
        ]}
      />

      <Section title="Invocation">
        {fromQueue ? (
          <Callout>
            Edges leaving a queue are always asynchronous: the queue delivers
            without waiting for a response.
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
              hint={`Receives ~${portion}% of ${sourceLabel}'s requests, relative to its other outgoing edges.`}
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
              label="Call probability"
              hint="Fraction of requests that invoke this edge. 100% = every request; lower for conditional calls such as payments."
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

      <Section title="Retry policy">
        {isAsync ? (
          <Callout>
            Retries apply to synchronous edges only. An async caller never
            observes the failure, so there is nothing to retry.
          </Callout>
        ) : (
          <>
            <Field
              id="edge-retries"
              label="Max retries"
              hint={
                retries === 0
                  ? "Disabled: a failed call fails the request."
                  : `Up to ${retries} additional ${retries === 1 ? "attempt" : "attempts"} per failed call.`
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
                  label="Initial backoff"
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
                  Retry amplification: every retry is extra load on{" "}
                  {targetLabel}. Near saturation this can sustain an overload
                  (retry storm).
                </Callout>
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Circuit breaker">
        {isAsync ? (
          <Callout>
            Circuit breakers apply to synchronous edges only. An async caller
            never observes failures, so there is nothing to trip on.
          </Callout>
        ) : (
          <>
            <Field
              id="edge-breaker-threshold"
              label="Failure threshold"
              hint={
                threshold === 0
                  ? "Disabled. Set a failure share to enable the breaker; 0% turns it off."
                  : `Opens when the smoothed failure share on this edge reaches ${toPercent(threshold)}%.`
              }
              changed={data.breakerThreshold !== undefined}
              onReset={() =>
                updateEdgeBreaker(id, { breakerThreshold: undefined })
              }>
              <UnitInput
                id="edge-breaker-threshold"
                value={
                  data.breakerThreshold === undefined
                    ? undefined
                    : toPercent(data.breakerThreshold)
                }
                base={0}
                unit="%"
                min={0}
                max={95}
                step={1}
                onChange={(percent) =>
                  updateEdgeBreaker(id, {
                    breakerThreshold:
                      percent === undefined ? undefined : percent / 100,
                  })
                }
              />
            </Field>
            {breaking && (
              <>
                <Field
                  id="edge-breaker-cooldown"
                  label="Cool-down"
                  hint="Time the breaker stays open before probing the target."
                  changed={data.breakerCooldownMs !== undefined}
                  onReset={() =>
                    updateEdgeBreaker(id, { breakerCooldownMs: undefined })
                  }>
                  <UnitInput
                    id="edge-breaker-cooldown"
                    value={data.breakerCooldownMs}
                    base={DEFAULT_COOLDOWN_MS}
                    unit="ms"
                    min={100}
                    max={60_000}
                    onChange={(breakerCooldownMs) =>
                      updateEdgeBreaker(id, { breakerCooldownMs })
                    }
                  />
                </Field>
                <Callout>
                  Open: calls fail fast without loading {targetLabel}, but the
                  caller's own work is still wasted. Half-open: after the
                  cool-down, 10% of calls probe the target for 1 s. If the probe
                  failure share stays under the threshold the breaker closes;
                  otherwise it re-opens.
                </Callout>
                {retrying && (
                  <Callout>
                    Retry attempts also pass through the breaker, so they fail
                    fast while it is open and cannot amplify load on{" "}
                    {targetLabel}.
                  </Callout>
                )}
              </>
            )}
          </>
        )}
      </Section>

      <Section title="Appearance">
        <Field
          id="edge-label"
          label="Label"
          hint="Text shown on the edge, such as the protocol.">
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
        <Field label="Arrowheads">
          <Segmented
            label="Arrowheads"
            value={data.direction}
            options={DIRECTION_OPTIONS}
            onChange={(direction) => updateEdgeDirection(id, direction)}
          />
        </Field>
      </Section>
    </>
  );
}
