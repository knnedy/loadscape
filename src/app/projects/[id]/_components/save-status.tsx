"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutosave } from "../_lib/use-autosave";

const pill =
  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors";

export function SaveStatus({ projectId }: { projectId: string }) {
  const { status, retry } = useAutosave(projectId);

  if (status === "error") {
    return (
      <button
        type="button"
        onClick={retry}
        className={cn(
          pill,
          "bg-destructive/10 text-destructive hover:bg-destructive/15",
        )}>
        <AlertCircle size={12} />
        Not saved
        <span className="underline underline-offset-2">Retry</span>
      </button>
    );
  }

  if (status === "signed-out") {
    // Opens in a new tab so the unsaved edits stay on screen. Returning to
    // this tab retries the save automatically.
    return (
      <a
        href="/sign-in?redirect=%2Fprojects"
        target="_blank"
        rel="noreferrer"
        className={cn(
          pill,
          "bg-destructive/10 text-destructive hover:bg-destructive/15",
        )}>
        <AlertCircle size={12} />
        Signed out
        <span className="underline underline-offset-2">Sign in</span>
      </a>
    );
  }

  if (status === "saved") {
    return (
      <span role="status" className={cn(pill, "bg-ok/10 text-ok")}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
        </span>
        Saved
      </span>
    );
  }

  return (
    <span role="status" className={cn(pill, "bg-muted text-muted-foreground")}>
      {status === "saving" ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {status === "saving" ? "Saving..." : "Unsaved"}
    </span>
  );
}
