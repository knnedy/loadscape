"use client";

import { useReactFlow } from "@xyflow/react";
import { templates } from "@/lib/catalog/templates";
import { useTopologyStore } from "../_store/topology-provider";

export function EmptyState() {
  const isEmpty = useTopologyStore((s) => s.nodes.length === 0);
  const insertTemplate = useTopologyStore((s) => s.insertTemplate);
  const { fitView } = useReactFlow();

  if (!isEmpty) return null;

  function handleInsert(template: (typeof templates)[number]) {
    insertTemplate(template);
    requestAnimationFrame(() =>
      fitView({ maxZoom: 1, padding: 0.4, duration: 300 }),
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-5 flex items-center justify-center">
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur-sm">
        <h2 className="text-base font-semibold text-foreground">
          Start your design
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Press{" "}
          <kbd className="rounded border border-border px-1 py-0.5 text-xs">
            ⌘K
          </kbd>{" "}
          to add your first component, or begin from a scenario.
        </p>

        <div className="mt-3 flex flex-col gap-1">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleInsert(template)}
              className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent">
              <span className="text-sm font-medium text-foreground">
                {template.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {template.description}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
