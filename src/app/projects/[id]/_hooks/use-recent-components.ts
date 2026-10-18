"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const STORAGE_KEY = "loadscape:recent-components";
const CHANGE_EVENT = "loadscape:recent-components-change";
const MAX_RECENTS = 5;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

// A string snapshot stays referentially stable between reads, which is
// what useSyncExternalStore needs.
function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function parse(raw: string): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function useRecentComponentIds() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "");
  const ids = useMemo(() => parse(raw), [raw]);

  const record = useCallback((id: string) => {
    const next = [
      id,
      ...parse(getSnapshot()).filter((existing) => existing !== id),
    ].slice(0, MAX_RECENTS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      return;
    }
    // The `storage` event only fires in other tabs, so notify this one too.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { ids, record };
}
