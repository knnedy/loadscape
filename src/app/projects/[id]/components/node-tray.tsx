"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { categories, componentsByCategory } from "@/lib/catalog/components";

export function NodeTray() {
  return (
    <aside className="flex w-14 shrink-0 flex-col items-center gap-1 border-r border-border bg-card py-3">
      {categories.map(({ category, label, icon: Icon }) => (
        <Popover key={category}>
          <PopoverTrigger asChild>
            <button
              title={label}
              className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              <Icon size={18} />
            </button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" className="w-48 p-1">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {label}
            </p>
            {componentsByCategory(category).map((component) => (
              <button
                key={component.id}
                className="w-full rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent">
                {component.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      ))}
    </aside>
  );
}
