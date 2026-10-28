"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { formatRateCompact } from "@/lib/simulation/capacity";
import { summarizeRun, type NodeSummary } from "@/lib/simulation/summary";
import type { Frame } from "@/lib/simulation/types";
import type { TopologyNodeData } from "@/lib/types/topology";
import { cn } from "@/lib/utils";
import { useFocusNode } from "../../_hooks/use-focus-node";
import { useSimulationStore } from "../../_store/simulation-provider";
import { useTopologyStore } from "../../_store/topology-provider";

const CHART_WIDTH = 288;
const CHART_HEIGHT = 56;
const CHART_PADDING = 2;
const MAX_LISTED = 3;

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatPercent(share: number) {
  const rounded = Math.round(share * 1000) / 10;
  return `${share < 1 ? Math.min(rounded, 99.9) : rounded}%`;
}

function formatLag(seconds: number) {
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
}

function refusedDetail(node: NodeSummary) {
  const from =
    node.firstRefusedAt === null
      ? ""
      : ` from ${formatClock(node.firstRefusedAt)}`;
  const saturated =
    node.saturatedSeconds > 0
      ? `, at capacity for ${formatClock(node.saturatedSeconds)}`
      : "";
  return `Refused ${formatRateCompact(node.refused)} requests${from}${saturated}.`;
}

function queueDetail(node: NodeSummary) {
  const parts = [`Peak depth ${formatRateCompact(node.peakQueue)}`];
  if (node.isQueue) parts.push(`peak lag ${formatLag(node.peakLagSeconds)}`);
  if (node.fullAt !== null) parts.push(`full at ${formatClock(node.fullAt)}`);
  return parts.join(" · ");
}

function linePath(
  history: Frame[],
  pick: (frame: Frame) => number,
  max: number,
) {
  const last = Math.max(1, history.length - 1);
  const usable = CHART_HEIGHT - CHART_PADDING * 2;
  return history
    .map((frame, index) => {
      const x = (index / last) * CHART_WIDTH;
      const y = CHART_HEIGHT - CHART_PADDING - (pick(frame) / max) * usable;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join("");
}

function Sparkline({ history }: { history: Frame[] }) {
  const max = Math.max(1, ...history.map((frame) => frame.totals.generated));

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Requests generated and completed over time"
      className="h-14 w-full">
      <path
        d={linePath(history, (frame) => frame.totals.generated, max)}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.25}
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={linePath(history, (frame) => frame.totals.goodput, max)}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={1.75}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 px-2 py-1.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn("font-mono text-sm text-foreground", className)}>
        {value}
      </span>
    </div>
  );
}

function NodeRow({
  label,
  detail,
  onSelect,
}: {
  label: string;
  detail: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </button>
  );
}

function SummaryCard() {
  const [open, setOpen] = useState(true);
  const history = useSimulationStore((s) => s.history);
  const graph = useSimulationStore((s) => s.graph);
  const nodes = useTopologyStore((s) => s.nodes);
  const focusNode = useFocusNode();

  const summary = useMemo(
    () => (graph ? summarizeRun(history, graph) : null),
    [history, graph],
  );
  const labels = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of nodes) {
      if (node.type === "component") {
        map.set(node.id, (node.data as TopologyNodeData).label);
      }
    }
    return map;
  }, [nodes]);

  if (!open || !summary) return null;

  const labelOf = (id: string) => labels.get(id) ?? id;
  const bottleneck = summary.bottleneck
    ? summary.nodes.find((node) => node.id === summary.bottleneck?.id)
    : undefined;
  const alsoRefused = summary.nodes
    .filter((node) => node.refused >= 1 && node.id !== bottleneck?.id)
    .slice(0, MAX_LISTED);
  const queues = summary.nodes
    .filter((node) => node.peakQueue >= 1)
    .slice(0, MAX_LISTED);
  const allClear =
    !summary.bottleneck && summary.successRate === 1 && summary.lost < 1;

  return (
    <div className="absolute top-28 right-4 z-20 flex max-h-[calc(100%-8rem)] w-80 flex-col overflow-y-auto rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Run summary</h3>
          <p className="text-xs text-muted-foreground">
            {formatClock(summary.seconds)} of simulated time
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close summary"
          className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          <X size={14} />
        </button>
      </div>

      <div className="mt-3">
        <p className="font-mono text-2xl font-semibold text-foreground">
          {formatPercent(summary.successRate)}
        </p>
        <p className="text-xs text-muted-foreground">
          of requests completed ({formatRateCompact(summary.succeeded)} of{" "}
          {formatRateCompact(summary.generated)})
        </p>
      </div>

      <div className="mt-3">
        <Sparkline history={history} />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>0:00</span>
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 rounded bg-primary" />
              completed
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-3 rounded bg-muted-foreground/70" />
              generated
            </span>
          </span>
          <span>{formatClock(summary.seconds)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Generated" value={formatRateCompact(summary.generated)} />
        <Stat
          label="Dropped"
          value={formatRateCompact(summary.dropped)}
          className={summary.dropped >= 1 ? "text-destructive" : undefined}
        />
        <Stat
          label="Lost silently"
          value={formatRateCompact(summary.lost)}
          className={
            summary.lost >= 1 ? "text-amber-600 dark:text-amber-400" : undefined
          }
        />
      </div>

      {summary.firstFailureAt !== null && (
        <p className="mt-3 text-xs text-muted-foreground">
          More than 2% of requests began failing at{" "}
          {formatClock(summary.firstFailureAt)}.
        </p>
      )}
      {allClear && (
        <p className="mt-3 text-xs text-muted-foreground">
          Everything completed. Nothing was dropped or lost.
        </p>
      )}

      {bottleneck && summary.bottleneck && (
        <div className="mt-4">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            {summary.bottleneck.kind === "refusing"
              ? "Where it broke"
              : "Closest to its limit"}
          </p>
          <NodeRow
            label={labelOf(bottleneck.id)}
            detail={
              summary.bottleneck.kind === "refusing"
                ? refusedDetail(bottleneck)
                : `Peaked at ${Math.round(bottleneck.peakUtilization * 100)}% of capacity. No requests were refused.`
            }
            onSelect={() => focusNode(bottleneck.id)}
          />
        </div>
      )}

      {alsoRefused.length > 0 && (
        <div className="mt-3">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            Also refused requests
          </p>
          {alsoRefused.map((node) => (
            <NodeRow
              key={node.id}
              label={labelOf(node.id)}
              detail={refusedDetail(node)}
              onSelect={() => focusNode(node.id)}
            />
          ))}
        </div>
      )}

      {queues.length > 0 && (
        <div className="mt-3">
          <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
            Waiting
          </p>
          {queues.map((node) => (
            <NodeRow
              key={node.id}
              label={labelOf(node.id)}
              detail={queueDetail(node)}
              onSelect={() => focusNode(node.id)}
            />
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        Illustrative only. Capacities are assumptions, so read this as the shape
        of a failure, not a forecast.
      </p>
    </div>
  );
}

export function RunSummary() {
  const finished = useSimulationStore((s) => s.status === "finished");
  return finished ? <SummaryCard /> : null;
}
