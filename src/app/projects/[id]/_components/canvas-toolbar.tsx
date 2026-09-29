"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  Plus,
  BoxSelect,
  LayoutTemplate,
  MessageSquareText,
  Undo2,
  Redo2,
  PictureInPicture2,
  Wand2,
  ImageDown,
  FileDown,
  FileUp,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { categories, componentCatalog } from "@/lib/catalog/components";
import {
  useTopologyStore,
  useTopologyStoreApi,
  useTopologyTemporalStore,
} from "../_store/topology-provider";
import { Icon as IconifyIcon } from "@iconify/react";
import { templates } from "@/lib/catalog/templates";
import { useReactFlow } from "@xyflow/react";
import { renderCanvasToPng } from "@/lib/export-image";
import { downloadText, downloadUrl } from "@/lib/download";
import { parseTopology, serializeTopology } from "../_lib/topology-io";

const iconButtonClass =
  "flex h-9.5 w-9.5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30";

export function CanvasToolbar() {
  const addComponent = useTopologyStore((s) => s.addComponent);
  const addGroup = useTopologyStore((s) => s.addGroup);
  const showMiniMap = useTopologyStore((s) => s.showMiniMap);
  const toggleMiniMap = useTopologyStore((s) => s.toggleMiniMap);
  const insertTemplate = useTopologyStore((s) => s.insertTemplate);
  const addNote = useTopologyStore((s) => s.addNote);
  const tidyLayout = useTopologyStore((s) => s.tidyLayout);
  const { undo, redo, pastStates, futureStates } = useTopologyTemporalStore(
    (s) => s,
  );
  const hasNodes = useTopologyStore((s) => s.nodes.length > 0);
  const replaceTopology = useTopologyStore((s) => s.replaceTopology);

  const [open, setOpen] = useState(false);
  const { getNodes, getNodesBounds, fitView } = useReactFlow();
  const storeApi = useTopologyStoreApi();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleExportPng() {
    const nodes = getNodes();
    if (nodes.length === 0) return;
    try {
      const dataUrl = await renderCanvasToPng(getNodesBounds(nodes));
      downloadUrl(dataUrl, "loadscape-diagram.png");
    } catch (error) {
      console.error("PNG export failed", error);
    }
  }

  function handleExportJson() {
    const { nodes, edges } = storeApi.getState();
    if (nodes.length === 0) return;
    downloadText(
      serializeTopology(nodes, edges),
      "loadscape-diagram.json",
      "application/json",
    );
  }

  async function handleImportJson(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { nodes, edges } = parseTopology(await file.text());
      replaceTopology(nodes, edges);
      requestAnimationFrame(() =>
        fitView({ maxZoom: 1, padding: 0.4, duration: 300 }),
      );
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Couldn't import that file.",
      );
    }
  }

  return (
    <aside className="absolute top-1/2 left-4 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm">
      <Popover open={open} onOpenChange={setOpen}>
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

      <Tooltip>
        <TooltipTrigger onClick={addGroup} className={iconButtonClass}>
          <BoxSelect size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Add group</TooltipContent>
      </Tooltip>

      <Popover>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                className={`${iconButtonClass} aria-expanded:bg-accent aria-expanded:text-accent-foreground`}>
                <LayoutTemplate size={17} />
              </PopoverTrigger>
            }
          />
          <TooltipContent side="right">Insert template</TooltipContent>
        </Tooltip>
        <PopoverContent side="right" align="start" className="w-64 p-1">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Scenario templates
          </p>
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => insertTemplate(template)}
              className="flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent">
              <span className="text-sm font-medium text-foreground">
                {template.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {template.description}
              </span>
            </button>
          ))}
        </PopoverContent>
      </Popover>

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
          onClick={() => tidyLayout()}
          className={iconButtonClass}>
          <Wand2 size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Tidy up layout</TooltipContent>
      </Tooltip>

      <div className="my-1 h-px w-6 bg-border" />

      <Tooltip>
        <TooltipTrigger
          onClick={handleExportPng}
          disabled={!hasNodes}
          className={iconButtonClass}>
          <ImageDown size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Export as PNG</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={handleExportJson}
          disabled={!hasNodes}
          className={iconButtonClass}>
          <FileDown size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Export as JSON</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          onClick={() => fileInputRef.current?.click()}
          className={iconButtonClass}>
          <FileUp size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">Import JSON</TooltipContent>
      </Tooltip>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleImportJson}
        className="hidden"
      />
    </aside>
  );
}
