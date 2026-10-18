"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getCategoryDef } from "@/lib/catalog/components";
import type { TopologyNodeData } from "@/lib/types/topology";
import { useFocusNode } from "../_hooks/use-focus-node";
import { useTopologyStore } from "../_store/topology-provider";
import type { AppNode } from "../_store/topology-store";

const triggerClass =
  "flex h-9.5 w-9.5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground";

const MAX_NOTE_LABEL = 48;

interface Result {
  id: string;
  label: string;
  detail: string;
  color: string;
}

function buildResults(nodes: AppNode[]) {
  const components: Result[] = [];
  const groups: Result[] = [];
  const notes: Result[] = [];

  for (const node of nodes) {
    if (node.type === "component") {
      const data = node.data as TopologyNodeData;
      components.push({
        id: node.id,
        label: data.label,
        detail: getCategoryDef(data.category).label,
        color: `var(--cat-${data.category})`,
      });
    } else if (node.type === "group-container") {
      const { label } = node.data as { label?: string };
      groups.push({
        id: node.id,
        label: label?.trim() || "Untitled group",
        detail: "Group",
        color: "var(--muted-foreground)",
      });
    } else if (node.type === "note") {
      const text = (node.data as { text?: string }).text
        ?.replace(/\s+/g, " ")
        .trim();
      notes.push({
        id: node.id,
        label: text
          ? text.length > MAX_NOTE_LABEL
            ? `${text.slice(0, MAX_NOTE_LABEL)}...`
            : text
          : "Empty note",
        detail: "Note",
        color: "var(--muted-foreground)",
      });
    }
  }

  return { components, groups, notes };
}

function ResultGroup({
  heading,
  results,
  onPick,
}: {
  heading: string;
  results: Result[];
  onPick: (id: string) => void;
}) {
  if (results.length === 0) return null;

  return (
    <CommandGroup heading={heading}>
      {results.map((result) => (
        <CommandItem
          key={result.id}
          // The id keeps values unique when several nodes share a name.
          value={`${result.label} ${result.detail} ${result.id}`}
          onSelect={() => onPick(result.id)}
          className="gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ background: result.color }}
          />
          <span className="truncate">{result.label}</span>
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {result.detail}
          </span>
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

// Rendered only while the popover is open, so the list isn't rebuilt on
// every drag frame.
function NodeResults({ onPick }: { onPick: (id: string) => void }) {
  const nodes = useTopologyStore((s) => s.nodes);
  const { components, groups, notes } = useMemo(
    () => buildResults(nodes),
    [nodes],
  );

  return (
    <>
      <CommandEmpty>
        {nodes.length === 0
          ? "Nothing on the canvas yet."
          : "No matching nodes."}
      </CommandEmpty>
      <ResultGroup heading="Components" results={components} onPick={onPick} />
      <ResultGroup heading="Groups" results={groups} onPick={onPick} />
      <ResultGroup heading="Notes" results={notes} onPick={onPick} />
    </>
  );
}

export function NodeSearch() {
  const [open, setOpen] = useState(false);
  const focusNode = useFocusNode();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }
      e.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handlePick(id: string) {
    setOpen(false);
    focusNode(id);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger className={triggerClass}>
              <Search size={17} />
            </PopoverTrigger>
          }
        />
        <TooltipContent side="right">
          Find a node <kbd className="ml-1 opacity-70">/</kbd>
        </TooltipContent>
      </Tooltip>
      <PopoverContent side="right" align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Find a node..." />
          <CommandList className="max-h-80">
            <NodeResults onPick={handlePick} />
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
