import Link from "next/link";
import { ChevronDown, History, Play, Waypoints } from "lucide-react";
import { UserMenu } from "./user-menu";

export function TopBar({ projectName }: { projectName: string }) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between bg-card px-4 shadow-[0_1px_0_0_var(--border)]">
      <div className="flex items-center gap-2">
        <Link
          href="/projects"
          className="flex h-7 w-7 items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent">
          <Waypoints size={16} />
        </Link>
        <span className="text-sm text-muted-foreground">/</span>
        <button className="flex items-center gap-2 rounded-md py-1 pr-1.5 pl-1 transition-colors hover:bg-accent">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary">
            {projectName.charAt(0).toUpperCase()}
          </span>
          <span className="text-[15px] font-semibold text-foreground">
            {projectName}
          </span>
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          Saved
        </span>
        <div className="h-5 w-px bg-border" />
        <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <History size={14} />
          History
        </button>
        <button className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
          <Play size={13} fill="currentColor" />
          Run
        </button>
        <div className="h-5 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
