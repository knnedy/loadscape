"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { MoreHorizontal, Pencil, Trash2, Waypoints } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MAX_PROJECT_NAME_LENGTH } from "@/lib/utils";
import { deleteProject, renameProject, type ActionResult } from "../actions";
import { RelativeTime } from "./relative-time";

type ActionError = Extract<ActionResult, { ok: false }>["error"];

function describeError(error: ActionError) {
  switch (error) {
    case "invalid":
      return `Use between 1 and ${MAX_PROJECT_NAME_LENGTH} characters.`;
    case "not_found":
      return "This project no longer exists.";
    case "unauthorized":
      return "Your session has expired. Sign in again.";
  }
}

function RenameDialog({
  id,
  name,
  onClose,
}: {
  id: string;
  name: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await renameProject(id, value);
      if (result.ok) {
        onClose();
        return;
      }
      if (result.error === "unauthorized") {
        router.push("/sign-in?redirect=%2Fprojects");
        return;
      }
      setError(describeError(result.error));
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Rename project</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            maxLength={MAX_PROJECT_NAME_LENGTH}
            aria-label="Project name"
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || value.trim().length === 0}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  id,
  name,
  onClose,
}: {
  id: string;
  name: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteProject(id);
      if (result.ok) {
        onClose();
        return;
      }
      if (result.error === "unauthorized") {
        router.push("/sign-in?redirect=%2Fprojects");
        return;
      }
      setError(describeError(result.error));
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            &ldquo;{name}&rdquo; and its diagram will be permanently deleted.
            This can&rsquo;t be undone.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectCardProps {
  id: string;
  name: string;
  updatedAt: Date;
}

export function ProjectCard({ id, name, updatedAt }: ProjectCardProps) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-foreground/25">
      <Link
        href={`/projects/${id}`}
        className="block outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset">
        <div
          className="flex aspect-[16/10] items-center justify-center border-b border-border bg-muted/30"
          style={{
            backgroundImage:
              "radial-gradient(var(--canvas-dot) 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}>
          <Waypoints size={28} className="text-muted-foreground/30" />
        </div>
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          <p className="text-xs text-muted-foreground">
            Edited <RelativeTime date={updatedAt} />
          </p>
        </div>
      </Link>

      <div className="absolute top-2.5 right-2.5">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`Actions for ${name}`}
            className="flex size-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted-foreground backdrop-blur-sm transition-opacity outline-none hover:text-foreground focus-visible:opacity-100 aria-expanded:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
            <MoreHorizontal size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => setRenameOpen(true)}
              className="gap-2 text-sm">
              <Pencil size={14} />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteOpen(true)}
              className="gap-2 text-sm text-destructive">
              <Trash2 size={14} />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {renameOpen && (
        <RenameDialog
          id={id}
          name={name}
          onClose={() => setRenameOpen(false)}
        />
      )}
      {deleteOpen && (
        <DeleteDialog
          id={id}
          name={name}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </div>
  );
}
