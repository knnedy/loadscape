"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTopologyStoreApi } from "../_store/topology-provider";
import { saveTopology } from "../actions";

export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "signed-out";

type Outcome = "ok" | "unauthorized" | "rejected" | "network";

const DEBOUNCE_MS = 1000;
const RETRY_MS = 5000;

export function useAutosave(projectId: string) {
  const storeApi = useTopologyStoreApi();
  const [status, setStatus] = useState<SaveStatus>("saved");
  const retryRef = useRef<() => void>(() => {});

  useEffect(() => {
    let current: SaveStatus = "saved";
    let dirty = false;
    let inFlight = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function update(next: SaveStatus) {
      current = next;
      setStatus(next);
    }

    function clearTimer() {
      if (timer) clearTimeout(timer);
      timer = null;
    }

    async function attempt(): Promise<Outcome> {
      try {
        const { nodes, edges } = storeApi.getState();
        const result = await saveTopology(projectId, { nodes, edges });
        if (result.ok) return "ok";
        return result.error === "unauthorized" ? "unauthorized" : "rejected";
      } catch {
        return "network";
      }
    }

    // One save at a time. Edits that land mid-save set `dirty` again, and the
    // loop saves once more with the latest state.
    async function runSave() {
      if (inFlight || !dirty) return;
      inFlight = true;
      clearTimer();
      try {
        while (dirty) {
          dirty = false;
          update("saving");
          const outcome = await attempt();
          if (outcome !== "ok") {
            dirty = true;
            update(outcome === "unauthorized" ? "signed-out" : "error");
            if (outcome === "network") {
              timer = setTimeout(() => {
                timer = null;
                void runSave();
              }, RETRY_MS);
            }
            return;
          }
        }
        update("saved");
      } finally {
        inFlight = false;
      }
    }

    function schedule() {
      dirty = true;
      if (current !== "saving") update("dirty");
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        void runSave();
      }, DEBOUNCE_MS);
    }

    // The undo history only advances on real edits: selection and
    // measurement changes are excluded, and a drag commits once on drop.
    const unsubscribe = storeApi.temporal.subscribe((state, previous) => {
      if (
        state.pastStates !== previous.pastStates ||
        state.futureStates !== previous.futureStates
      ) {
        schedule();
      }
    });

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") void runSave();
    }
    function handleFocus() {
      if (current === "error" || current === "signed-out") void runSave();
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (dirty || inFlight) event.preventDefault();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("beforeunload", handleBeforeUnload);
    retryRef.current = () => void runSave();

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearTimer();
      // Leaving the page inside the app: flush whatever is pending.
      void runSave();
    };
  }, [projectId, storeApi]);

  const retry = useCallback(() => retryRef.current(), []);

  return { status, retry };
}
