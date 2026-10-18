"use client";

import { useEffect } from "react";
import {
  useTopologyStore,
  useTopologyTemporalStore,
} from "../_store/topology-provider";

export function useGlobalShortcuts() {
  const togglePanel = useTopologyStore((s) => s.togglePanel);
  const undo = useTopologyTemporalStore((s) => s.undo);
  const redo = useTopologyTemporalStore((s) => s.redo);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();

      if (key === "k") {
        e.preventDefault();
        togglePanel("palette");
        return;
      }

      if (key !== "z") return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePanel, undo, redo]);
}
