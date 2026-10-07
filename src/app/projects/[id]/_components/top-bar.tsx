"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { History, Play, Waypoints, Sun, Moon } from "lucide-react";
import { UserMenu, type AppUser } from "../../_components/user-menu";
import { ProjectName } from "./project-name";
import { SaveStatus } from "./save-status";

export function TopBar({
  projectId,
  projectName,
  user,
}: {
  projectId: string;
  projectName: string;
  user: AppUser;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <header
      className="relative z-20 flex h-14 shrink-0 items-center justify-between bg-card px-4"
      style={{
        boxShadow:
          "0 1px 0 0 var(--border), 0 16px 32px -24px rgba(0,0,0,0.55)",
      }}>
      <div className="flex items-center gap-2">
        <Link
          href="/projects"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-primary transition-colors hover:bg-primary/20">
          <Waypoints size={16} />
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <ProjectName projectId={projectId} initialName={projectName} />
      </div>

      <div className="flex items-center gap-3">
        <SaveStatus projectId={projectId} />

        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <History size={14} />
          History
        </button>

        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Sun size={15} className="hidden dark:block" />
          <Moon size={15} className="block dark:hidden" />
        </button>

        <div className="h-5 w-px bg-border" />

        <button
          className="group flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-transform duration-150 hover:opacity-90 active:scale-[0.97]"
          style={{
            boxShadow:
              "inset 0 1px 0 0 color-mix(in oklch, var(--primary-foreground) 20%, transparent)",
          }}>
          <Play size={13} fill="currentColor" />
          Run
        </button>

        <div className="h-5 w-px bg-border" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
