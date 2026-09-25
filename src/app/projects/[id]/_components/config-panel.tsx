"use client";

import { Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { protocolPresets } from "@/lib/catalog/protocols";
import { useTopologyStore } from "../_store/topology-provider";
import type { NodeCategory, TopologyNodeData } from "@/lib/types/topology";
import {
  componentCatalog,
  getCategoryDef,
  getAnnotation,
} from "@/lib/catalog/components";

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

export function ConfigPanel() {
  const selectedNodeId = useTopologyStore((s) => s.selectedNodeId);
  const selectedEdgeId = useTopologyStore((s) => s.selectedEdgeId);
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const updateNodeCapacity = useTopologyStore((s) => s.updateNodeCapacity);
  const updateEdgeLabel = useTopologyStore((s) => s.updateEdgeLabel);
  const updateEdgeStyle = useTopologyStore((s) => s.updateEdgeStyle);
  const updateEdgeDirection = useTopologyStore((s) => s.updateEdgeDirection);

  const node = nodes.find((n) => n.id === selectedNodeId);
  const edge = edges.find((e) => e.id === selectedEdgeId);

  if (node && node.type === "component") {
    const data = node.data as TopologyNodeData;
    const component = componentCatalog.find((c) => c.id === data.componentId);
    return (
      <aside className="w-70 shrink-0 border-l border-border bg-card p-4">
        <CategoryChip category={data.category} />
        <h3 className="mt-2 text-sm font-semibold text-foreground">
          {data.label}
        </h3>
        {component && (
          <p className="mt-1 text-xs text-muted-foreground italic">
            ({getAnnotation(component)})
          </p>
        )}
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="capacity" className="text-xs">
            Capacity (req/sec)
          </Label>
          <Input
            id="capacity"
            type="number"
            value={data.capacity ?? ""}
            onChange={(e) =>
              updateNodeCapacity(node.id, Number(e.target.value))
            }
            className="font-mono"
          />
        </div>
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

    return (
      <aside className="w-70 shrink-0 border-l border-border bg-card p-4">
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
      </aside>
    );
  }

  return null;
}
