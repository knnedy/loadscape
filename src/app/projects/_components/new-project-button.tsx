"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { createProject } from "../actions";

function useCreateProject() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      // A successful create redirects into the new project. The action only
      // returns when the session is gone.
      const result = await createProject();
      if (result?.error === "unauthorized") {
        router.push("/sign-in?redirect=%2Fprojects");
      }
    });
  }

  return { pending, create };
}

export function NewProjectButton() {
  const { pending, create } = useCreateProject();

  return (
    <button
      onClick={create}
      disabled={pending}
      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-transform duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
      style={{
        boxShadow:
          "inset 0 1px 0 0 color-mix(in oklch, var(--primary-foreground) 20%, transparent)",
      }}>
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Plus size={14} />
      )}
      New project
    </button>
  );
}

// A dashed placeholder card, like an empty node waiting to be filled.
export function NewProjectTile() {
  const { pending, create } = useCreateProject();

  return (
    <button
      onClick={create}
      disabled={pending}
      className="group flex h-full min-h-56 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:cursor-wait">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary/20">
        {pending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Plus size={18} />
        )}
      </span>
      <span className="text-sm font-medium">New project</span>
    </button>
  );
}
