"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTopologyStore } from "../_store/topology-provider";

export function ConfigPanel() {
  const selectedNodeId = useTopologyStore((s) => s.selectedNodeId);
  const nodes = useTopologyStore((s) => s.nodes);
  const updateNodeCapacity = useTopologyStore((s) => s.updateNodeCapacity);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) return null;

  return (
    <aside className="w-70 shrink-0 border-l border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">
        {node.data.category.toUpperCase()}
      </p>
      <h3 className="mt-1 text-sm font-semibold text-foreground">
        {node.data.label}
      </h3>

      <div className="mt-4 flex flex-col gap-1.5">
        <Label htmlFor="capacity" className="text-xs">
          Capacity (req/sec)
        </Label>
        <Input
          id="capacity"
          type="number"
          value={node.data.capacity ?? ""}
          onChange={(e) => updateNodeCapacity(node.id, Number(e.target.value))}
          className="font-mono"
        />
      </div>
    </aside>
  );
}
