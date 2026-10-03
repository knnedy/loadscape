"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { createProject } from "../actions";

export function NewProjectButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      // A successful create redirects into the new project. The action only
      // returns when the session is gone.
      const result = await createProject();
      if (result?.error === "unauthorized") {
        router.push("/sign-in?redirect=%2Fprojects");
      }
    });
  }

  return (
    <button
      onClick={handleClick}
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
