"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { MAX_PROJECT_NAME_LENGTH, normalizeProjectName } from "@/lib/utils";
import { renameProject } from "../../../actions";

export function ProjectName({
  projectId,
  initialName,
}: {
  projectId: string;
  initialName: string;
}) {
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [failed, setFailed] = useState(false);
  // Enter and blur can both fire; only the first one counts.
  const settledRef = useRef(false);

  function startEditing() {
    settledRef.current = false;
    setDraft(name);
    setFailed(false);
    setEditing(true);
  }

  function cancel() {
    settledRef.current = true;
    setEditing(false);
  }

  async function commit() {
    if (settledRef.current) return;
    settledRef.current = true;
    setEditing(false);

    const normalized = normalizeProjectName(draft);
    if (!normalized || normalized === name) return;

    const previous = name;
    setName(normalized);
    const result = await renameProject(projectId, normalized);
    if (!result.ok) {
      setName(previous);
      setFailed(true);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void commit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") cancel();
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={() => void commit()}
          onKeyDown={handleKeyDown}
          maxLength={MAX_PROJECT_NAME_LENGTH}
          aria-label="Project name"
          className="h-7 w-52 rounded-md border border-primary bg-background px-2 text-[13px] font-medium text-foreground ring-4 ring-primary/15 outline-none"
        />
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={startEditing}
        title="Rename project"
        className="rounded-md px-1.5 py-1 transition-colors hover:bg-accent">
        <span className="block max-w-56 truncate text-[13px] font-medium text-foreground">
          {name}
        </span>
      </button>
      {failed && (
        <span role="alert" className="text-xs text-destructive">
          Rename failed
        </span>
      )}
    </div>
  );
}
