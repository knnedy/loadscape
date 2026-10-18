"use client";

import { useState } from "react";
import {
  Plus,
  BoxSelect,
  MessageSquareText,
  Undo2,
  Redo2,
  PictureInPicture2,
  Wand2,
  ImageDown,
  FileDown,
  FileUp,
  Magnet,
  Download,
} from "lucide-react";
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
import {
  useTopologyStore,
  useTopologyTemporalStore,
} from "../../_store/topology-provider";
import { useDiagramFiles } from "../../_hooks/use-diagram-files";
import type { TemplateSummary } from "../../_actions/template-actions";
import { ComponentPalette } from "./component-palette";
import { TemplatesMenu } from "./templates-menu";
import { ShortcutsButton } from "./shortcuts-dialog";
import { NodeSearch } from "./node-search";

const iconButtonClass =
  "flex h-9.5 w-9.5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30";

export function CanvasToolbar({
  userTemplates,
}: {
  userTemplates: TemplateSummary[];
}) {
  const addComponent = useTopologyStore((s) => s.addComponent);
  const addGroup = useTopologyStore((s) => s.addGroup);
  const showMiniMap = useTopologyStore((s) => s.showMiniMap);
  const toggleMiniMap = useTopologyStore((s) => s.toggleMiniMap);
  const addNote = useTopologyStore((s) => s.addNote);
  const tidyLayout = useTopologyStore((s) => s.tidyLayout);
  const { undo, redo, pastStates, futureStates } = useTopologyTemporalStore(
    (s) => s,
  );
  const hasNodes = useTopologyStore((s) => s.nodes.length > 0);
  const snapToGrid = useTopologyStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useTopologyStore((s) => s.toggleSnapToGrid);
  const activePanel = useTopologyStore((s) => s.activePanel);
  const openPanel = useTopologyStore((s) => s.openPanel);
  const closePanel = useTopologyStore((s) => s.closePanel);

  const [exportOpen, setExportOpen] = useState(false);
  const { exportPng, exportJson, openImportPicker } = useDiagramFiles();

  return (
    <aside className="absolute top-1/2 left-4 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
      <Popover
        open={activePanel === "palette"}
        onOpenChange={(next) => {
          if (next) openPanel("palette");
          else if (activePanel === "palette") closePanel();
        }}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger className={iconButtonClass}>
                <Plus size={18} />
              </PopoverTrigger>
            }
          />
          <TooltipContent side="right">
            Add component <kbd className="ml-1 opacity-70">⌘K</kbd>
          </TooltipContent>
        </Tooltip>
        <PopoverContent side="right" align="start" className="w-72 p-0">
          <ComponentPalette
            onPick={(component) => {
              addComponent(component);
              closePanel();
            }}
          />
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger onClick={addGroup} className={iconButtonClass}>
          <BoxSelect size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Add group</TooltipContent>
      </Tooltip>

      <TemplatesMenu userTemplates={userTemplates} />

      <Tooltip>
        <TooltipTrigger onClick={addNote} className={iconButtonClass}>
          <MessageSquareText size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Add note</TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-border" />

      <Tooltip>
        <TooltipTrigger
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          className={iconButtonClass}>
          <Undo2 size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">
          Undo <kbd className="ml-1 opacity-70">⌘Z</kbd>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          className={iconButtonClass}>
          <Redo2 size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">
          Redo <kbd className="ml-1 opacity-70">⇧⌘Z</kbd>
        </TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-border" />

      <NodeSearch />

      <Tooltip>
        <TooltipTrigger
          onClick={toggleMiniMap}
          className={`flex h-9.5 w-9.5 items-center justify-center rounded-xl transition-colors ${
            showMiniMap
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}>
          <PictureInPicture2 size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Toggle minimap</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={toggleSnapToGrid}
          aria-pressed={snapToGrid}
          className={`flex h-9.5 w-9.5 items-center justify-center rounded-xl transition-colors ${
            snapToGrid
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          }`}>
          <Magnet size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Snap to grid</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={() => tidyLayout()}
          className={iconButtonClass}>
          <Wand2 size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Tidy up layout</TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-border" />

      <Popover open={exportOpen} onOpenChange={setExportOpen}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                disabled={!hasNodes}
                className={`${iconButtonClass} aria-expanded:bg-accent aria-expanded:text-accent-foreground`}>
                <Download size={17} />
              </PopoverTrigger>
            }
          />
          <TooltipContent side="right">Export</TooltipContent>
        </Tooltip>
        <PopoverContent side="right" align="start" className="w-44 p-1">
          <button
            onClick={() => {
              setExportOpen(false);
              exportPng();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent">
            <ImageDown size={15} className="text-muted-foreground" />
            PNG image
          </button>
          <button
            onClick={() => {
              setExportOpen(false);
              exportJson();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent">
            <FileDown size={15} className="text-muted-foreground" />
            JSON file
          </button>
        </PopoverContent>
      </Popover>

      <Tooltip>
        <TooltipTrigger onClick={openImportPicker} className={iconButtonClass}>
          <FileUp size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Import JSON</TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-border" />

      <ShortcutsButton />
    </aside>
  );
}
