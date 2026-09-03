"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { categories, componentsByCategory } from "@/lib/catalog/components";
import { useTopologyStore } from "../_store/topology-provider";

export function NodeTray() {
  const addComponent = useTopologyStore((s) => s.addComponent);

  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3">
      {categories.map(({ category, label, icon: Icon }) => (
        <Popover key={category}>
          <PopoverTrigger
            title={label}
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <Icon size={18} />
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-48 p-1">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {label}
            </p>
            {componentsByCategory(category).map((component) => (
              <button
                key={component.id}
                onClick={() => addComponent(component)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent">
                <component.icon size={14} className="shrink-0" />
                <span className="truncate">{component.label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      ))}
    </aside>
  );
}
