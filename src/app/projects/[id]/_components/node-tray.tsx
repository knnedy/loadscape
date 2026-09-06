"use client";

import { useEffect, useState } from "react";
import { Plus, Frame } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { categories, componentCatalog } from "@/lib/catalog/components";
import { useTopologyStore } from "../_store/topology-provider";
import { Icon as IconifyIcon } from "@iconify/react";
import { Map } from "lucide-react";

export function NodeTray() {
  const addComponent = useTopologyStore((s) => s.addComponent);
  const addGroup = useTopologyStore((s) => s.addGroup);
  const showMiniMap = useTopologyStore((s) => s.showMiniMap);
  const toggleMiniMap = useTopologyStore((s) => s.toggleMiniMap);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <aside className="absolute top-1/2 left-4 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          title="Add component (⌘K)"
          className="flex h-9.5 w-9.5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          <Plus size={18} />
        </PopoverTrigger>
        <PopoverContent side="right" align="start" className="w-72 p-0">
          <Command>
            <CommandInput placeholder="Search components..." />
            <CommandList className="max-h-80">
              <CommandEmpty>No components found.</CommandEmpty>
              {categories.map(({ category, label }) => {
                const items = componentCatalog.filter(
                  (c) => c.category === category,
                );
                if (items.length === 0) return null;
                return (
                  <CommandGroup key={category} heading={label}>
                    {items.map((component) => (
                      <CommandItem
                        key={component.id}
                        value={`${component.label} ${label}`}
                        onSelect={() => {
                          addComponent(component);
                          setOpen(false);
                        }}
                        className="gap-2">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white p-0.5 text-neutral-800">
                          <IconifyIcon
                            icon={component.icon}
                            width={14}
                            height={14}
                          />
                        </div>
                        <span className="truncate">{component.label}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="my-1 h-px w-6 bg-border" />
      <button
        title="Add group"
        onClick={addGroup}
        className="flex h-9.5 w-9.5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
        <Frame size={17} />
      </button>
      <button
        title="Toggle minimap"
        onClick={toggleMiniMap}
        className={`flex h-9.5 w-9.5 items-center justify-center rounded-xl transition-colors ${
          showMiniMap
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}>
        <Map size={17} />
      </button>
    </aside>
  );
}
