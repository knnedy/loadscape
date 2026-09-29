"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { ChevronDown, History, Play, Waypoints, Sun, Moon } from "lucide-react";
import { UserMenu } from "./user-menu";

export function TopBar({ projectName }: { projectName: string }) {
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
        <button className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 transition-colors hover:bg-accent">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
            {projectName.charAt(0).toUpperCase()}
          </span>
          <span className="text-[15px] font-semibold text-foreground">
            {projectName}
          </span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 rounded-full bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ok" />
          </span>
          Saved
        </span>

        <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <History size={14} />
          History
        </button>

        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground trans...">
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
        <UserMenu />
      </div>
    </header>
  );
}
