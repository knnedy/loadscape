"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { analyzeReadiness } from "../_lib/topology-readiness";
import { useFocusNode } from "../_hooks/use-focus-node";
import { useTopologyStore } from "../_store/topology-provider";

const pill =
  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors";

export function ReadinessIndicator() {
  const nodes = useTopologyStore((s) => s.nodes);
  const edges = useTopologyStore((s) => s.edges);
  const readiness = useMemo(
    () => analyzeReadiness(nodes, edges),
    [nodes, edges],
  );
  const focusNode = useFocusNode();
  const [open, setOpen] = useState(false);

  if (readiness.componentCount === 0) return null;

  const total = readiness.issues.length;

  if (total === 0) {
    return (
      <span role="status" className={cn(pill, "bg-ok/10 text-ok")}>
        <CheckCircle2 size={13} />
        Ready
      </span>
    );
  }

  const hasErrors = readiness.errorCount > 0;
  const Icon = hasErrors ? AlertCircle : TriangleAlert;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          pill,
          hasErrors
            ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
            : "bg-amber-500/10 text-amber-600 hover:bg-amber-500/15 dark:text-amber-400",
        )}>
        <Icon size={13} />
        {total} {total === 1 ? "issue" : "issues"}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1">
        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Before you run
        </p>
        <ul className="max-h-72 overflow-y-auto">
          {readiness.issues.map((issue) => {
            const isError = issue.severity === "error";
            const RowIcon = isError ? AlertCircle : TriangleAlert;
            const content = (
              <>
                <RowIcon
                  size={14}
                  className={cn(
                    "mt-0.5 shrink-0",
                    isError
                      ? "text-destructive"
                      : "text-amber-600 dark:text-amber-400",
                  )}
                />
                <span className="text-sm text-foreground">{issue.message}</span>
              </>
            );

            return (
              <li key={issue.id}>
                {issue.nodeId ? (
                  <button
                    type="button"
                    onClick={() => {
                      focusNode(issue.nodeId!);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent">
                    {content}
                  </button>
                ) : (
                  <div className="flex items-start gap-2 px-2 py-1.5">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
