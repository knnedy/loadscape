import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({ projectName }: { projectName: string }) {
  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-sm font-semibold tracking-tight text-foreground">
          Loadscape
        </span>
        <span className="text-sm text-muted-foreground">{projectName}</span>
      </div>
      <Button size="sm" className="gap-1.5">
        <Play size={14} />
        Run
      </Button>
    </header>
  );
}
