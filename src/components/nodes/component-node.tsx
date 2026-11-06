"use client";

import { useMemo, useRef, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { PowerOff } from "lucide-react";
import type { TopologyNodeData } from "@/lib/types/topology";
import {
  componentCatalog,
  getCategoryDef,
  getAnnotation,
} from "@/lib/catalog/components";
import { formatRate, formatRateCompact } from "@/lib/simulation/capacity";
import { presetFor } from "@/lib/simulation/catalog-presets";
import {
  estimateNodeLatency,
  formatLatency,
  latencyTitle,
} from "@/lib/simulation/latency-display";
import { PRESETS } from "@/lib/simulation/presets";
import type { NodeFrame } from "@/lib/simulation/types";
import { useNodeDown } from "@/app/projects/[id]/_hooks/use-node-fault";
import { useThrottledSimulation } from "@/app/projects/[id]/_hooks/use-throttled-simulation";
import { useTopologyStore } from "@/app/projects/[id]/_store/topology-provider";
import { Icon as IconifyIcon } from "@iconify/react";

type ComponentNodeType = Node<TopologyNodeData, "component">;

const RATE_THRESHOLD = 0.5;

// `dropped` includes what the rate limiter turned away and what a killed node
// refused. Those are policy and fault injection, not overload, so they are
// shown on their own rows.
function overloadDrops(frame: NodeFrame) {
  return Math.max(0, frame.dropped - frame.limited - frame.unavailable);
}

// Timeouts fail the callers of a service, so they count as shedding there.
// At a queue they are silent TTL expiries and only warn.
function sheds(frame: NodeFrame, isQueue: boolean) {
  return (
    overloadDrops(frame) >= RATE_THRESHOLD ||
    (!isQueue && frame.timedOut >= RATE_THRESHOLD)
  );
}

function toneFor(frame: NodeFrame, isQueue: boolean) {
  if (sheds(frame, isQueue) || frame.utilization >= 0.95) {
    return "bg-destructive";
  }
  return frame.utilization >= 0.7 ||
    frame.timedOut >= RATE_THRESHOLD ||
    frame.limited >= RATE_THRESHOLD
    ? "bg-amber-500"
    : "bg-ok";
}

function formatLag(seconds: number) {
  return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "destructive" | "warning";
}) {
  return (
    <div className="flex justify-between font-mono text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          tone === "destructive"
            ? "text-destructive"
            : "text-amber-600 dark:text-amber-400"
        }>
        {value}
      </span>
    </div>
  );
}

function Gauge({ frame, isQueue }: { frame: NodeFrame; isQueue: boolean }) {
  const percent = Math.round(frame.utilization * 100);
  const drops = overloadDrops(frame);
  const dropping = drops >= RATE_THRESHOLD;
  const limiting = frame.limited >= RATE_THRESHOLD;
  const expiring = frame.timedOut >= RATE_THRESHOLD;
  const refusing = frame.unavailable >= RATE_THRESHOLD;

  // Percentiles are estimated on demand from the frame's mean and variance,
  // and only when this node's numbers change.
  const { latencyMs, latencyVariance } = frame;
  const estimate = useMemo(
    () => estimateNodeLatency({ latencyMs, latencyVariance }),
    [latencyMs, latencyVariance],
  );

  return (
    <div className="flex flex-col gap-1">
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-[width] duration-100 ${toneFor(frame, isQueue)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{percent}%</span>
        {dropping && (
          <span className="text-destructive">
            drop {formatRateCompact(drops)}/s
          </span>
        )}
      </div>
      {estimate && (
        <div
          title={latencyTitle(estimate)}
          className="flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>p50 ≈{formatLatency(estimate.p50)}</span>
          <span>p99 ≈{formatLatency(estimate.p99)}</span>
        </div>
      )}
      {refusing && (
        <Row
          label="unavailable"
          value={`${formatRateCompact(frame.unavailable)}/s`}
          tone="destructive"
        />
      )}
      {limiting && (
        <Row
          label="rate limited"
          value={`${formatRateCompact(frame.limited)}/s`}
          tone="warning"
        />
      )}
      {expiring && (
        <Row
          label={isQueue ? "ttl expired" : "timeout"}
          value={`${formatRateCompact(frame.timedOut)}/s`}
          tone={isQueue ? "warning" : "destructive"}
        />
      )}
      {isQueue && (
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>depth {formatRateCompact(frame.queue)}</span>
          <span>lag {formatLag(frame.lagSeconds)}</span>
        </div>
      )}
    </div>
  );
}

export function ComponentNode({
  id,
  data,
  selected,
}: NodeProps<ComponentNodeType>) {
  const component = componentCatalog.find((c) => c.id === data.componentId);
  const categoryDef = getCategoryDef(data.category);
  const annotation = component
    ? getAnnotation(component)
    : categoryDef.defaultAnnotation;
  const isCapsule = categoryDef.shape === "capsule";
  const catColor = `var(--cat-${data.category})`;

  const preset = PRESETS[presetFor(data.componentId, data.category)];
  const limitsLoad = Number.isFinite(preset.capacity);
  const isQueue = preset.role === "queue";
  const instances = data.instances ?? 1;
  const perInstance = data.capacity ?? preset.capacity;

  const frame =
    useThrottledSimulation((s) => s.frame?.nodes[id] ?? null) ?? null;
  const down = useNodeDown(id);
  const shedding = !down && frame !== null && sheds(frame, isQueue);

  const renameNode = useTopologyStore((s) => s.renameNode);
  const readOnly = useTopologyStore((s) => s.readOnly);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  // Enter and blur can both fire; only the first one counts.
  const settledRef = useRef(false);

  function startEditing() {
    settledRef.current = false;
    setDraft(data.label);
    setEditing(true);
  }

  function cancel() {
    settledRef.current = true;
    setEditing(false);
  }

  function commit() {
    if (settledRef.current) return;
    settledRef.current = true;
    const trimmed = draft.trim();
    if (trimmed && trimmed !== data.label) renameNode(id, trimmed);
    setEditing(false);
  }

  const handleStyle = {
    background: down ? "var(--destructive)" : catColor,
    width: 8,
    height: 8,
    borderRadius: 2,
    border: "1.5px solid var(--card)",
  };

  return (
    <div
      className={`group relative flex flex-col bg-card transition-shadow ${
        isCapsule
          ? "items-center justify-center rounded-full px-5 py-2.5"
          : "gap-2 rounded-xl px-3 py-2.5"
      }`}
      style={{
        border: down
          ? "2px dashed var(--destructive)"
          : `2px solid ${catColor}`,
        boxShadow: selected
          ? "0 0 0 3px color-mix(in oklch, var(--primary) 45%, transparent)"
          : shedding
            ? "0 0 0 3px color-mix(in oklch, var(--destructive) 40%, transparent)"
            : undefined,
        width: isCapsule ? undefined : 160,
        minWidth: isCapsule ? 110 : undefined,
      }}>
      {down && (
        <span className="pointer-events-none absolute -top-2.5 right-3 flex items-center gap-1 rounded-md border border-destructive/40 bg-card px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-destructive uppercase shadow-sm">
          <PowerOff size={10} />
          down
        </span>
      )}

      <Handle
        id="in"
        type="target"
        position={Position.Left}
        style={handleStyle}
      />

      <div className={`flex items-center gap-2 ${isCapsule ? "" : "mb-0.5"}`}>
        {component && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white p-0.5 text-neutral-800">
            <IconifyIcon icon={component.icon} width={14} height={14} />
          </div>
        )}
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            onClick={(e) => e.stopPropagation()}
            aria-label="Component name"
            className="nodrag w-24 rounded border border-border bg-background px-1 py-0.5 text-xs text-foreground outline-none"
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (!readOnly) startEditing();
            }}
            className={`truncate text-[13px] leading-tight font-medium ${
              down ? "text-muted-foreground" : "text-foreground"
            }`}>
            {data.label}
          </span>
        )}
      </div>

      {isCapsule && frame && (
        <div className="font-mono text-[11px] text-muted-foreground">
          {formatRateCompact(frame.offered)} req/s
        </div>
      )}

      {!isCapsule && (
        <>
          {limitsLoad && (
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>cap</span>
              <span>
                {instances > 1
                  ? `${instances} × ${formatRate(perInstance)}`
                  : formatRate(perInstance)}
              </span>
            </div>
          )}
          <div className="truncate text-[11px] text-muted-foreground italic">
            ({annotation})
          </div>
          {limitsLoad && frame && <Gauge frame={frame} isQueue={isQueue} />}
        </>
      )}

      <Handle
        id="out"
        type="source"
        position={Position.Right}
        style={handleStyle}
      />
    </div>
  );
}
