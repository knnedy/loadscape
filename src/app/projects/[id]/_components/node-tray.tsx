"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  categories,
  groupedComponentsByCategory,
} from "@/lib/catalog/components";
import { useTopologyStore } from "../_store/topology-provider";
import { Icon as IconifyIcon } from "@iconify/react";

export function NodeTray() {
  const addComponent = useTopologyStore((s) => s.addComponent);

  return (
    <aside className="absolute top-1/2 left-4 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
      {categories.map(({ category, label, icon: Icon }) => {
        const groups = groupedComponentsByCategory(category);
        return (
          <div key={category} className="group relative">
            <Popover>
              <PopoverTrigger className="flex h-9.5 w-9.5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground">
                <Icon size={17} />
              </PopoverTrigger>
              <PopoverContent
                side="right"
                align="center"
                className="max-h-96 w-60 overflow-y-auto rounded-xl p-1 shadow-lg [scrollbar-color:var(--border)_transparent] scrollbar-thin">
                <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {label}
                </p>
                {Array.from(groups.entries()).map(([groupName, items]) => (
                  <div key={groupName || "ungrouped"}>
                    {groupName && (
                      <p className="px-2 pt-2 pb-0.5 text-[10px] font-medium tracking-wide text-muted-foreground/70 uppercase">
                        {groupName}
                      </p>
                    )}
                    {items.map((component) => (
                      <button
                        key={component.id}
                        onClick={() => addComponent(component)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white p-0.5">
                          <IconifyIcon
                            icon={component.icon}
                            width={14}
                            height={14}
                          />
                        </div>
                        <span className="truncate">{component.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </PopoverContent>
            </Popover>
            <span className="pointer-events-none absolute top-1/2 left-full z-20 ml-2 -translate-y-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-has-aria-expanded:opacity-0">
              {label}
            </span>
          </div>
        );
      })}
    </aside>
  );
}
