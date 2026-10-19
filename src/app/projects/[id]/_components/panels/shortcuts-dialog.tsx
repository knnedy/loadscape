"use client";

import { useEffect } from "react";
import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTopologyStore } from "../../_store/topology-provider";
import { formatKey, shortcutGroups } from "../../_lib/shortcuts";

function Keys({ keys, isMac }: { keys: string[]; isMac: boolean }) {
  return (
    <span className="flex items-center gap-1">
      {keys.map((key) => (
        <kbd
          key={key}
          className="min-w-6 rounded-md border border-border bg-muted px-1.5 py-0.5 text-center font-mono text-[11px] text-muted-foreground">
          {formatKey(key, isMac)}
        </kbd>
      ))}
    </span>
  );
}

export function ShortcutsButton() {
  const open = useTopologyStore((s) => s.activePanel === "shortcuts");
  const openPanel = useTopologyStore((s) => s.openPanel);
  const closePanel = useTopologyStore((s) => s.closePanel);
  const togglePanel = useTopologyStore((s) => s.togglePanel);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "?" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement;
      if (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }
      e.preventDefault();
      togglePanel("shortcuts");
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePanel]);

  // Only read while the dialog is open, so it never runs during server
  // rendering.
  const isMac = open && /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          onClick={() => openPanel("shortcuts")}
          className="flex h-9.5 w-9.5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
          <Keyboard size={17} />
        </TooltipTrigger>
        <TooltipContent side="right">
          Keyboard shortcuts <kbd className="ml-1 opacity-70">?</kbd>
        </TooltipContent>
      </Tooltip>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) openPanel("shortcuts");
          else closePanel();
        }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Press ? any time to open this list.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {shortcutGroups.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-xs font-medium text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="flex flex-col gap-2">
                  {group.shortcuts.map((shortcut) => (
                    <li
                      key={shortcut.label}
                      className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-foreground">{shortcut.label}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <Keys keys={shortcut.keys} isMac={isMac} />
                        {shortcut.alternate && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              or
                            </span>
                            <Keys keys={shortcut.alternate} isMac={isMac} />
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
