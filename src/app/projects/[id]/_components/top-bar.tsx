import Link from "next/link";
import { ChevronRight, History, Play, Check } from "lucide-react";
import { UserMenu } from "./user-menu";

export function TopBar({ projectName }: { projectName: string }) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between bg-card px-5 shadow-[0_1px_0_0_var(--border),0_4px_12px_-8px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/projects"
          className="font-mono text-[13px] font-semibold tracking-tight text-foreground transition-colors hover:text-muted-foreground">
          Loadscape
        </Link>
        <ChevronRight size={14} className="text-muted-foreground" />
        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
        <button className="rounded-md px-1.5 py-0.5 text-foreground transition-colors hover:bg-accent">
          {projectName}
        </button>
        <span className="ml-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Check size={12} />
          Saved
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5">
          <button className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            <History size={13} />
            History
          </button>
          <button className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90">
            <Play size={13} />
            Run
          </button>
        </div>
        <UserMenu />
      </div>
    </header>
  );
}
