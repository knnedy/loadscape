"use client";

import { useEffect, useRef } from "react";
import { useStoreApi } from "@xyflow/react";
import { useEdgeGeometry } from "@/components/edges/edge-geometry";
import { pointAt } from "@/lib/edge-routing/sample-path";
import { DOWNSTREAM_FAILURE } from "@/lib/simulation/flow-visuals";
import {
  BURST_SECONDS,
  advanceEdgeParticles,
  createEdgeParticles,
  smoothstep,
  type EdgeParticles,
  type Particle,
} from "@/lib/simulation/particles";
import type { SimGraph } from "@/lib/simulation/types";
import { useOptionalSimulationStoreApi } from "../../_store/simulation-provider";

const TAU = Math.PI * 2;
const MAX_STEP_SECONDS = 0.1;
const COLOR_REFRESH_MS = 1000;
const FALLBACK_COLOR = "#888";

interface QueueTarget {
  id: string;
  isQueue: boolean;
  buffer: number;
}

function targetsOf(graph: SimGraph): Map<string, QueueTarget> {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const targets = new Map<string, QueueTarget>();
  for (const edge of graph.edges) {
    const node = nodes.get(edge.target);
    targets.set(edge.id, {
      id: edge.target,
      isQueue: node?.role === "queue",
      buffer: node?.buffer ?? 0,
    });
  }
  return targets;
}

function createColorResolver(element: Element) {
  const cache = new Map<string, string>();
  let stamp = 0;
  return (variable: string, now: number) => {
    if (now - stamp > COLOR_REFRESH_MS) {
      cache.clear();
      stamp = now;
    }
    let value = cache.get(variable);
    if (value === undefined) {
      value =
        getComputedStyle(element).getPropertyValue(variable).trim() ||
        FALLBACK_COLOR;
      cache.set(variable, value);
    }
    return value;
  };
}

function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

// Original requests are solid; retries are hollow rings, so the extra load
// from a retry policy is visible next to the traffic that caused it.
function body(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
  hollow: boolean,
) {
  if (!hollow) {
    dot(ctx, x, y, radius, color, alpha);
    return;
  }
  dot(ctx, x, y, radius, color, alpha * 0.2);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  progress: number,
  particle: Particle,
  base: string,
  destructive: string,
) {
  if (particle.burst !== null) {
    const t = Math.min(1, particle.burst / BURST_SECONDS);
    dot(ctx, x, y, radius, destructive, (1 - t) * 0.5);
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = destructive;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, radius * (1 + 3 * t), 0, TAU);
    ctx.stroke();
    return;
  }

  const hollow = particle.retry;
  body(ctx, x, y, radius, base, 1, hollow);
  if (particle.kind === "rejected") {
    body(
      ctx,
      x,
      y,
      radius,
      destructive,
      smoothstep((progress - 0.55) / 0.45),
      hollow,
    );
  } else if (particle.kind === "downstream") {
    body(ctx, x, y, radius, DOWNSTREAM_FAILURE, 0.85, hollow);
  }
}

export function ParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ width: 0, height: 0, ratio: 1 });
  const simulation = useOptionalSimulationStoreApi();
  const geometry = useEdgeGeometry();
  const flowStore = useStoreApi();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const observer = new ResizeObserver(([entry]) => {
      const ratio = window.devicePixelRatio || 1;
      const { width, height } = entry.contentRect;
      sizeRef.current = { width, height, ratio };
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!simulation || !geometry || !canvas || !ctx) return;

    const resolveColor = createColorResolver(canvas);
    const states = new Map<string, EdgeParticles>();
    let cachedGraph: SimGraph | null = null;
    let targets = new Map<string, QueueTarget>();
    let frameId = 0;
    let last = 0;

    function clear() {
      const { width, height, ratio } = sizeRef.current;
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx!.clearRect(0, 0, width, height);
    }

    function tick(now: number) {
      frameId = requestAnimationFrame(tick);
      const seconds = Math.min((now - last) / 1000, MAX_STEP_SECONDS);
      last = now;

      clear();
      const { frame, graph, status } = simulation!.getState();
      if (!frame || !graph) {
        states.clear();
        return;
      }
      if (graph !== cachedGraph) {
        cachedGraph = graph;
        targets = targetsOf(graph);
      }

      const [tx, ty, zoom] = flowStore.getState().transform;
      const radius = Math.min(5, Math.max(2, 3 * zoom));
      const destructive = resolveColor("--destructive", now);
      const animate = status === "running";

      for (const id of states.keys()) {
        if (!geometry!.has(id)) states.delete(id);
      }

      for (const [id, edge] of geometry!) {
        const edgeFrame = frame.edges[id];
        if (!edgeFrame) continue;

        let state = states.get(id);
        if (!state) {
          state = createEdgeParticles();
          states.set(id, state);
        }

        if (animate) {
          const target = targets.get(id);
          const queueFill =
            target?.isQueue && target.buffer > 0
              ? (frame.nodes[target.id]?.queue ?? 0) / target.buffer
              : 0;
          advanceEdgeParticles(
            state,
            {
              length: edge.path.total,
              flow: edgeFrame.flow,
              retry: edgeFrame.retry,
              failed: edgeFrame.failed,
              rejected: edgeFrame.rejected,
              queueFill,
            },
            seconds,
          );
        }

        const base = resolveColor(edge.colorVar, now);
        for (const particle of state.particles) {
          const point = pointAt(edge.path, particle.distance);
          drawParticle(
            ctx!,
            point.x * zoom + tx,
            point.y * zoom + ty,
            radius,
            edge.path.total > 0 ? particle.distance / edge.path.total : 1,
            particle,
            base,
            destructive,
          );
        }
      }
      ctx!.globalAlpha = 1;
    }

    function sync() {
      if (simulation!.getState().status === "idle") {
        cancelAnimationFrame(frameId);
        frameId = 0;
        states.clear();
        clear();
      } else if (frameId === 0) {
        last = performance.now();
        frameId = requestAnimationFrame(tick);
      }
    }

    sync();
    const unsubscribe = simulation.subscribe((state, previous) => {
      if (state.status !== previous.status) sync();
    });

    return () => {
      unsubscribe();
      cancelAnimationFrame(frameId);
    };
  }, [simulation, geometry, flowStore]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ zIndex: 5 }}
    />
  );
}
