"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "loadscape:menu-tip-dismissed";

const listeners = new Set<() => void>();
// Covers browsers where storage is blocked: the tip stays dismissed for the
// rest of the session even if the flag can't be written.
let dismissedThisSession = false;

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readDismissed() {
  if (dismissedThisSession) return true;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return true;
  }
}

function dismissTip() {
  dismissedThisSession = true;
  try {
    window.localStorage.setItem(STORAGE_KEY, "1");
  } catch {}
  listeners.forEach((listener) => listener());
}

export function useMenuTip() {
  // The server render counts as dismissed, so the tip never flashes before
  // the browser has had a chance to read the flag.
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => true);
  return { visible: !dismissed, dismiss: dismissTip };
}

export function MenuTip({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="absolute top-full left-0 mt-3 w-64 animate-in rounded-xl border border-border bg-card p-3 shadow-lg duration-300 fade-in-0 slide-in-from-top-1">
      <span
        aria-hidden="true"
        className="absolute -top-1 left-5 size-2 rotate-45 border-t border-l border-border bg-card"
      />
      <p className="text-sm font-medium text-foreground">
        Everything lives here
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        File, Edit, View, Insert and Help. Export, themes, history and shortcuts
        are one click away.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-2 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
        Got it
      </button>
    </div>
  );
}
