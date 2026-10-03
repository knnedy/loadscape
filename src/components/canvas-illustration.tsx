"use client";

import { Icon as IconifyIcon } from "@iconify/react";
import {
  categories,
  componentCatalog,
  getAnnotation,
} from "@/lib/catalog/components";
import { cn } from "@/lib/utils";

const WIDTH = 480;
const HEIGHT = 440;
const NODE_W = 144;
const NODE_H = 46;

type Slot = { x: number; y: number };

// Follows the order of `categories`: client, networking, compute,
// database, cache, messaging.
const slots: Slot[] = [
  { x: 150, y: 44 },
  { x: 330, y: 142 },
  { x: 240, y: 250 },
  { x: 240, y: 384 },
  { x: 80, y: 384 },
  { x: 400, y: 384 },
];

const links = [
  { from: 0, to: 1, dashed: false },
  { from: 1, to: 2, dashed: false },
  { from: 2, to: 4, dashed: false },
  { from: 2, to: 3, dashed: false },
  { from: 2, to: 5, dashed: true },
];

function edgePath(a: Slot, b: Slot) {
  const y1 = a.y + NODE_H / 2;
  const y2 = b.y - NODE_H / 2;
  const mid = (y1 + y2) / 2;
  return `M ${a.x} ${y1} C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${y2}`;
}

function glow(color: string) {
  return `drop-shadow(0 0 3px color-mix(in oklch, ${color} 70%, transparent))`;
}

export function CanvasIllustration({ className }: { className?: string }) {
  const nodes = categories
    .slice(0, slots.length)
    .map(({ category, label }, i) => {
      const component = componentCatalog.find((c) => c.category === category);
      return {
        ...slots[i],
        category,
        color: `var(--cat-${category})`,
        name: component?.label ?? label,
        icon: component?.icon,
        note: component ? getAnnotation(component) : undefined,
        capsule: i === 0,
      };
    });
  const edges = links.filter(
    ({ from, to }) => from < nodes.length && to < nodes.length,
  );

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-auto w-full max-w-120", className)}
      aria-hidden="true">
      <defs>
        {nodes.map((node) => (
          <marker
            key={node.category}
            id={`arrow-${node.category}`}
            viewBox="0 0 10 10"
            refX={9}
            refY={5}
            markerWidth={10}
            markerHeight={10}
            markerUnits="userSpaceOnUse"
            orient="auto">
            <path d="M 0 1 L 9 5 L 0 9 Z" style={{ fill: node.color }} />
          </marker>
        ))}
      </defs>

      {edges.map(({ from, to, dashed }) => (
        <path
          key={`edge-${from}-${to}`}
          d={edgePath(nodes[from], nodes[to])}
          fill="none"
          strokeWidth={1.75}
          strokeDasharray={dashed ? "6 5" : undefined}
          markerEnd={`url(#arrow-${nodes[from].category})`}
          style={{ stroke: nodes[from].color, filter: glow(nodes[from].color) }}
        />
      ))}

      {edges.map(({ from, to }, i) => (
        <circle
          key={`pulse-${from}-${to}`}
          r={3.5}
          className="motion-reduce:hidden"
          style={{ fill: nodes[from].color, filter: glow(nodes[from].color) }}>
          <animateMotion
            path={edgePath(nodes[from], nodes[to])}
            dur={`${2.8 + (i % 3) * 0.6}s`}
            begin={`-${i * 0.9}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {nodes.map((node) => (
        <foreignObject
          key={node.category}
          x={node.x - NODE_W / 2}
          y={node.y - NODE_H / 2}
          width={NODE_W}
          height={NODE_H}
          style={{ overflow: "visible" }}>
          <div
            className={cn(
              "flex h-full items-center gap-2 border-[1.5px] px-2.5",
              node.capsule ? "rounded-full" : "rounded-lg",
            )}
            style={{
              borderColor: node.color,
              background: `color-mix(in oklch, ${node.color} 12%, var(--card))`,
            }}>
            {node.icon && (
              <div className="flex size-6 shrink-0 items-center justify-center rounded bg-white p-0.5 text-neutral-800">
                <IconifyIcon icon={node.icon} width={16} height={16} />
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[13px] font-medium text-foreground">
                {node.name}
              </p>
              {node.note && (
                <p className="truncate text-[10px] text-muted-foreground">
                  {node.note}
                </p>
              )}
            </div>
          </div>
        </foreignObject>
      ))}
    </svg>
  );
}
