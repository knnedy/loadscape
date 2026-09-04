import Link from "next/link";
import { ChevronDown, History, Play } from "lucide-react";
import { UserMenu } from "./user-menu";

export function TopBar({ projectName }: { projectName: string }) {
  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between bg-card px-5 shadow-[0_1px_0_0_var(--border)]">
      <div className="flex items-center gap-2.5">
        <Link
          href="/projects"
          className="font-mono text-sm text-muted-foreground transition-colors hover:text-foreground">
          Loadscape
        </Link>
        <span className="text-muted-foreground">/</span>
        <button className="flex items-center gap-1 text-[15px] font-semibold text-foreground">
          {projectName}
          <ChevronDown size={14} className="text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          Savedbg-ok
        </span>
        <div className="h-5 w-px bg-border" />
        <button className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
          <History size={14} />
          History
        </button>
        <button className="flex items-center gap-1.5 rounded-md bg-accent px-3.5 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90">
          <Play size={13} fill="currentColor" />
          Run
        </button>
        <div className="h-5 w-px bg-border" />
        <UserMenu />
      </div>
    </header>
  );
}
