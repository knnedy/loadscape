"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { protocolPresets } from "@/lib/catalog/protocols";
import { useTopologyStore } from "../_store/topology-provider";
import { TopologyNodeData } from "@/lib/types/topology";

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
    return (
      <aside className="w-70 shrink-0 border-l border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">
          {data.category.toUpperCase()}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">
          {data.label}
        </h3>
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
    return (
      <aside className="w-70 shrink-0 border-l border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">CONNECTION</p>
        <h3 className="mt-1 text-sm font-semibold text-foreground">
          {edge.source} → {edge.target}
        </h3>

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
