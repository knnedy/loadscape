"use client";

import { useMemo } from "react";
import { useCommandState } from "cmdk";
import { Icon as IconifyIcon } from "@iconify/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  categories,
  componentCatalog,
  type ComponentDef,
} from "@/lib/catalog/components";
import { useRecentComponentIds } from "../_lib/use-recent-components";

function ComponentRow({ component }: { component: ComponentDef }) {
  return (
    <>
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white p-0.5 text-neutral-800">
        <IconifyIcon icon={component.icon} width={14} height={14} />
      </div>
      <span className="truncate">{component.label}</span>
    </>
  );
}

function RecentGroup({
  components,
  onPick,
}: {
  components: ComponentDef[];
  onPick: (component: ComponentDef) => void;
}) {
  // Hidden while searching so a match isn't listed twice.
  const searching = useCommandState((state) => state.search.length > 0);
  if (searching || components.length === 0) return null;

  return (
    <CommandGroup heading="Recently used">
      {components.map((component) => (
        <CommandItem
          key={component.id}
          value={`recent ${component.id}`}
          onSelect={() => onPick(component)}
          className="gap-2">
          <ComponentRow component={component} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

export function ComponentPalette({
  onPick,
}: {
  onPick: (component: ComponentDef) => void;
}) {
  const { ids, record } = useRecentComponentIds();

  // Ids saved for components that no longer exist are dropped here.
  const recents = useMemo(
    () =>
      ids
        .map((id) => componentCatalog.find((c) => c.id === id))
        .filter((c): c is ComponentDef => c !== undefined),
    [ids],
  );

  function handlePick(component: ComponentDef) {
    record(component.id);
    onPick(component);
  }

  return (
    <Command>
      <CommandInput placeholder="Search components..." />
      <CommandList className="max-h-80">
        <CommandEmpty>No components found.</CommandEmpty>
        <RecentGroup components={recents} onPick={handlePick} />
        {categories.map(({ category, label }) => {
          const items = componentCatalog.filter((c) => c.category === category);
          if (items.length === 0) return null;
          return (
            <CommandGroup key={category} heading={label}>
              {items.map((component) => (
                <CommandItem
                  key={component.id}
                  value={`${component.label} ${label}`}
                  onSelect={() => handlePick(component)}
                  className="gap-2">
                  <ComponentRow component={component} />
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </Command>
  );
}
