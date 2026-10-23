"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useReactFlow } from "@xyflow/react";
import { ChevronDown, Waypoints } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDiagramFiles } from "../../_hooks/use-diagram-files";
import { formatKey } from "../../_lib/shortcuts";
import {
  useTopologyStore,
  useTopologyTemporalStore,
} from "../../_store/topology-provider";

function Keys({ keys }: { keys: string[] }) {
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
  return (
    <DropdownMenuShortcut>
      {keys.map((key) => formatKey(key, isMac)).join(" ")}
    </DropdownMenuShortcut>
  );
}

export function MainMenu({
  onOpenChange,
  showTooltip = true,
}: {
  onOpenChange?: (open: boolean) => void;
  showTooltip?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const { fitView } = useReactFlow();
  const { exportPng, exportJson, openImportPicker } = useDiagramFiles();

  const hasNodes = useTopologyStore((s) => s.nodes.length > 0);
  const hasSelection = useTopologyStore(
    (s) =>
      s.nodes.some((n) => n.selected) ||
      s.edges.some((e) => e.selected) ||
      s.selectedNodeId !== null ||
      s.selectedEdgeId !== null,
  );
  const selectedNodeId = useTopologyStore((s) => s.selectedNodeId);
  const showMiniMap = useTopologyStore((s) => s.showMiniMap);
  const toggleMiniMap = useTopologyStore((s) => s.toggleMiniMap);
  const snapToGrid = useTopologyStore((s) => s.snapToGrid);
  const toggleSnapToGrid = useTopologyStore((s) => s.toggleSnapToGrid);
  const openPanel = useTopologyStore((s) => s.openPanel);
  const addGroup = useTopologyStore((s) => s.addGroup);
  const addNote = useTopologyStore((s) => s.addNote);
  const tidyLayout = useTopologyStore((s) => s.tidyLayout);
  const duplicateNode = useTopologyStore((s) => s.duplicateNode);
  const deleteSelection = useTopologyStore((s) => s.deleteSelection);

  const undo = useTopologyTemporalStore((s) => s.undo);
  const redo = useTopologyTemporalStore((s) => s.redo);
  const canUndo = useTopologyTemporalStore((s) => s.pastStates.length > 0);
  const canRedo = useTopologyTemporalStore((s) => s.futureStates.length > 0);

  return (
    <DropdownMenu onOpenChange={(open) => onOpenChange?.(open)}>
      <Tooltip disabled={!showTooltip}>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label="Main menu"
              className="flex h-8 items-center gap-1 rounded-lg px-1.5 text-primary transition-colors outline-none hover:bg-accent aria-expanded:bg-accent">
              <Waypoints size={16} />
              <ChevronDown size={10} className="text-muted-foreground" />
            </DropdownMenuTrigger>
          }
        />
        <TooltipContent side="bottom">Menu</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" sideOffset={10} className="w-60">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>File</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuItem onClick={() => openPanel("history")}>
              Version history...
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPanel("share")}>
              Share...
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!hasNodes}
              onClick={() => openPanel("save-template")}>
              Save as template...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!hasNodes} onClick={exportPng}>
              Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!hasNodes} onClick={exportJson}>
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={openImportPicker}>
              Import JSON...
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/projects" />}>
              Back to projects
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Edit</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuItem disabled={!canUndo} onClick={() => undo()}>
              Undo
              <Keys keys={["mod", "Z"]} />
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canRedo} onClick={() => redo()}>
              Redo
              <Keys keys={["mod", "Shift", "Z"]} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={selectedNodeId === null}
              onClick={() => selectedNodeId && duplicateNode(selectedNodeId)}>
              Duplicate
              <Keys keys={["mod", "D"]} />
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              disabled={!hasSelection}
              onClick={deleteSelection}>
              Delete
              <Keys keys={["Delete"]} />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openPanel("search")}>
              Find node
              <Keys keys={["/"]} />
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!hasNodes} onClick={() => tidyLayout()}>
              Tidy up layout
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>View</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-52">
            <DropdownMenuCheckboxItem
              checked={showMiniMap}
              onCheckedChange={toggleMiniMap}>
              Minimap
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={snapToGrid}
              onCheckedChange={toggleSnapToGrid}>
              Snap to grid
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() =>
                fitView({ maxZoom: 1, padding: 0.4, duration: 300 })
              }>
              Zoom to fit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Theme</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-36">
                <DropdownMenuRadioGroup
                  value={resolvedTheme ?? "dark"}
                  onValueChange={(value) => setTheme(value)}>
                  <DropdownMenuRadioItem value="light">
                    Light
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">
                    Dark
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Insert</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuItem onClick={() => openPanel("palette")}>
              Component...
              <Keys keys={["mod", "K"]} />
            </DropdownMenuItem>
            <DropdownMenuItem onClick={addGroup}>Group</DropdownMenuItem>
            <DropdownMenuItem onClick={addNote}>Note</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPanel("templates")}>
              Templates...
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Help</DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-56">
            <DropdownMenuItem onClick={() => openPanel("shortcuts")}>
              Keyboard shortcuts
              <Keys keys={["?"]} />
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
