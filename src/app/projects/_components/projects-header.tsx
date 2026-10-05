"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Waypoints } from "lucide-react";
import { UserMenu, type AppUser } from "./user-menu";

export function ProjectsHeader({ user }: { user: AppUser }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Link
          href="/projects"
          aria-label="Projects"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/12 text-primary transition-colors hover:bg-primary/20">
          <Waypoints size={16} />
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="px-1.5 text-[15px] font-semibold text-foreground">
          Projects
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setTheme(isDark ? "light" : "dark")}
          aria-label="Toggle theme"
          title="Toggle theme"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <Sun size={15} className="hidden dark:block" />
          <Moon size={15} className="block dark:hidden" />
        </button>

        <div className="h-5 w-px bg-border" />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
