"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useReactFlow } from "@xyflow/react";
import { History, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { MAX_SNAPSHOT_NAME_LENGTH } from "@/lib/utils";
import { RelativeTime } from "../../../_components/relative-time";
import {
  useTopologyStore,
  useTopologyStoreApi,
} from "../../_store/topology-provider";
import {
  createSnapshot,
  deleteSnapshot,
  restoreSnapshot,
  type SnapshotActionError,
  type SnapshotSummary,
} from "../../_actions/snapshot-actions";

function describeError(error: SnapshotActionError) {
  switch (error) {
    case "unauthorized":
      return "Your session has expired. Sign in again in another tab, then retry.";
    case "not_found":
      return "That snapshot no longer exists.";
    case "limit":
      return "You've reached 30 snapshots for this project. Delete one first.";
    case "invalid":
      return `Use a name up to ${MAX_SNAPSHOT_NAME_LENGTH} characters.`;
  }
}

type Confirming = { kind: "restore" | "delete"; id: string };

export function HistoryMenu({
  projectId,
  snapshots,
}: {
  projectId: string;
  snapshots: SnapshotSummary[];
}) {
  const { fitView } = useReactFlow();
  const storeApi = useTopologyStoreApi();
  const replaceTopology = useTopologyStore((s) => s.replaceTopology);
  const hasNodes = useTopologyStore((s) => s.nodes.length > 0);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState<Confirming | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const defaultName = `Snapshot ${snapshots.length + 1}`;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirming(null);
      setError(null);
    }
  }

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const { nodes, edges } = storeApi.getState();
    startTransition(async () => {
      const result = await createSnapshot(
        projectId,
        name.trim() || defaultName,
        { nodes, edges },
      );
      if (!result.ok) {
        setError(describeError(result.error));
        return;
      }
      setName("");
    });
  }

  function handleRestore(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await restoreSnapshot(id);
      setConfirming(null);
      if (!result.ok) {
        setError(describeError(result.error));
        return;
      }
      replaceTopology(result.nodes, result.edges);
      setOpen(false);
      requestAnimationFrame(() =>
        fitView({ maxZoom: 1, padding: 0.4, duration: 300 }),
      );
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteSnapshot(id);
      setConfirming(null);
      if (!result.ok) setError(describeError(result.error));
    });
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground">
        <History size={14} />
        History
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Snapshots
        </p>

        <form onSubmit={handleSave} className="flex gap-1.5 px-2 pb-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_SNAPSHOT_NAME_LENGTH}
            placeholder={defaultName}
            aria-label="Snapshot name"
            className="h-8 text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={pending || !hasNodes}
            className="h-8 shrink-0">
            Save
          </Button>
        </form>

        <div className="my-1 h-px bg-border" />

        {snapshots.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            No snapshots yet. Save one before a risky change, and come back to
            it any time.
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto">
            {snapshots.map((snapshot) => {
              const isConfirming = confirming?.id === snapshot.id;
              return (
                <li
                  key={snapshot.id}
                  className="group flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-accent/60">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {snapshot.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <RelativeTime date={snapshot.createdAt} />
                    </p>
                  </div>

                  {isConfirming ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          confirming.kind === "restore"
                            ? handleRestore(snapshot.id)
                            : handleDelete(snapshot.id)
                        }
                        className={
                          confirming.kind === "restore"
                            ? "shrink-0 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                            : "shrink-0 rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                        }>
                        {confirming.kind === "restore"
                          ? "Replace diagram?"
                          : "Delete?"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirming({ kind: "restore", id: snapshot.id })
                        }
                        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent">
                        <RotateCcw size={12} />
                        Restore
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${snapshot.name}`}
                        onClick={() =>
                          setConfirming({ kind: "delete", id: snapshot.id })
                        }
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {error && (
          <p role="alert" className="px-2 py-1.5 text-xs text-destructive">
            {error}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
