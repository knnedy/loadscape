"use client";

import { BoxSelect, MessageSquareText, Plus, Redo2, Undo2 } from "lucide-react";
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
import type { TemplateSummary } from "../../_actions/template-actions";
import {
  useTopologyStore,
  useTopologyTemporalStore,
} from "../../_store/topology-provider";
import { ComponentPalette } from "../panels/component-palette";
import { TemplatesMenu } from "../panels/templates-menu";

const iconButtonClass =
  "flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30";

const primaryButtonClass =
  "flex h-9 items-center gap-2 rounded-xl bg-primary/12 pr-3.5 pl-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/20 aria-expanded:bg-primary/20";

export function CanvasDock({
  userTemplates,
}: {
  userTemplates: TemplateSummary[];
}) {
  const addComponent = useTopologyStore((s) => s.addComponent);
  const addGroup = useTopologyStore((s) => s.addGroup);
  const addNote = useTopologyStore((s) => s.addNote);
  const activePanel = useTopologyStore((s) => s.activePanel);
  const openPanel = useTopologyStore((s) => s.openPanel);
  const closePanel = useTopologyStore((s) => s.closePanel);
  const { undo, redo, pastStates, futureStates } = useTopologyTemporalStore(
    (s) => s,
  );

  return (
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur-sm">
      <Popover
        open={activePanel === "palette"}
        onOpenChange={(next) => {
          if (next) openPanel("palette");
          else if (activePanel === "palette") closePanel();
        }}>
        <PopoverTrigger className={primaryButtonClass}>
          <Plus size={16} />
          Add component
          <kbd className="ml-1 text-[11px] font-normal opacity-70">⌘K</kbd>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="center"
          sideOffset={12}
          className="w-72 p-0">
          <ComponentPalette
            onPick={(component) => {
              addComponent(component);
              closePanel();
            }}
          />
        </PopoverContent>
      </Popover>

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger
          onClick={addGroup}
          aria-label="Add group"
          className={iconButtonClass}>
          <BoxSelect size={17} />
        </TooltipTrigger>
        <TooltipContent side="top">Add group</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={addNote}
          aria-label="Add note"
          className={iconButtonClass}>
          <MessageSquareText size={17} />
        </TooltipTrigger>
        <TooltipContent side="top">Add note</TooltipContent>
      </Tooltip>

      <TemplatesMenu userTemplates={userTemplates} />

      <div className="mx-1 h-5 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          aria-label="Undo"
          className={iconButtonClass}>
          <Undo2 size={17} />
        </TooltipTrigger>
        <TooltipContent side="top">
          Undo <kbd className="ml-1 opacity-70">⌘Z</kbd>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          aria-label="Redo"
          className={iconButtonClass}>
          <Redo2 size={17} />
        </TooltipTrigger>
        <TooltipContent side="top">
          Redo <kbd className="ml-1 opacity-70">⇧⌘Z</kbd>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
