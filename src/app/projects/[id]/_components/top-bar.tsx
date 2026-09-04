import Link from "next/link";
import { ChevronRight, History, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "./user-menu";

export function TopBar({ projectName }: { projectName: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-1.5 text-sm">
        <Link
          href="/projects"
          className="font-mono font-semibold tracking-tight text-foreground transition-colors hover:text-muted-foreground">
          Loadscape
        </Link>
        <ChevronRight size={14} className="text-muted-foreground" />
        <span className="text-foreground">{projectName}</span>
        <span className="ml-2 text-xs text-muted-foreground">Saved</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground">
          <History size={14} />
          Run history
        </Button>
        <Button size="sm" className="gap-1.5">
          <Play size={14} />
          Run
        </Button>
        <Separator orientation="vertical" className="mx-1 h-5" />
        <UserMenu />
      </div>
    </header>
  );
}
