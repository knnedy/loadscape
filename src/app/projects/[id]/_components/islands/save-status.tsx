"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutosave } from "../../_hooks/use-autosave";

const base = "flex items-center gap-1.5 text-[11px] font-medium";
const problem = cn(
  base,
  "rounded-md px-1.5 py-1 text-destructive transition-colors hover:bg-destructive/10",
);

export function SaveStatus({ projectId }: { projectId: string }) {
  const { status, retry } = useAutosave(projectId);

  if (status === "error") {
    return (
      <button type="button" onClick={retry} className={problem}>
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
        className={problem}>
        <AlertCircle size={12} />
        Signed out
        <span className="underline underline-offset-2">Sign in</span>
      </a>
    );
  }

  if (status === "saved") {
    return (
      <span role="status" className={cn(base, "text-ok")}>
        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
        Saved
      </span>
    );
  }

  return (
    <span role="status" className={cn(base, "text-muted-foreground")}>
      {status === "saving" ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {status === "saving" ? "Saving..." : "Unsaved"}
    </span>
  );
}
