"use client";

import { useState, useTransition } from "react";
import { useReactFlow } from "@xyflow/react";
import { LayoutTemplate, Plus, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { templates as builtInTemplates } from "@/lib/catalog/templates";
import { useTopologyStore } from "../_store/topology-provider";
import {
  deleteTemplate,
  getTemplate,
  type TemplateSummary,
} from "../template-actions";
import {
  SaveTemplateDialog,
  describeTemplateError,
} from "./save-template-dialog";

const triggerClass =
  "flex h-9.5 w-9.5 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground";
const rowClass =
  "flex w-full flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent disabled:opacity-60";

export function TemplatesMenu({
  userTemplates,
}: {
  userTemplates: TemplateSummary[];
}) {
  const { fitView } = useReactFlow();
  const insertTemplate = useTopologyStore((s) => s.insertTemplate);
  const insertTopology = useTopologyStore((s) => s.insertTopology);
  const hasNodes = useTopologyStore((s) => s.nodes.length > 0);

  const [open, setOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function frame() {
    requestAnimationFrame(() =>
      fitView({ maxZoom: 1, padding: 0.4, duration: 300 }),
    );
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirmingId(null);
      setError(null);
    }
  }

  function handleInsertBuiltIn(template: (typeof builtInTemplates)[number]) {
    insertTemplate(template);
    setOpen(false);
    frame();
  }

  function handleInsertOwn(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await getTemplate(id);
      if (!result.ok) {
        setError(describeTemplateError(result.error));
        return;
      }
      insertTopology(result.nodes, result.edges);
      setOpen(false);
      frame();
    });
  }

  function handleDelete(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteTemplate(id);
      setConfirmingId(null);
      if (!result.ok) setError(describeTemplateError(result.error));
    });
  }

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger className={triggerClass}>
                <LayoutTemplate size={17} />
              </PopoverTrigger>
            }
          />
          <TooltipContent side="right">Templates</TooltipContent>
        </Tooltip>
        <PopoverContent side="right" align="start" className="w-72 p-1">
          <div className="max-h-96 overflow-y-auto">
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              My templates
            </p>
            {userTemplates.length === 0 ? (
              <p className="px-2 pb-2 text-xs text-muted-foreground">
                Save the current diagram to reuse it in any project.
              </p>
            ) : (
              userTemplates.map((template) => (
                <div
                  key={template.id}
                  className="group flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => handleInsertOwn(template.id)}
                    className={`${rowClass} min-w-0 flex-1`}>
                    <span className="w-full truncate text-sm font-medium text-foreground">
                      {template.name}
                    </span>
                    {template.description && (
                      <span className="w-full truncate text-xs text-muted-foreground">
                        {template.description}
                      </span>
                    )}
                  </button>
                  {confirmingId === template.id ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => handleDelete(template.id)}
                      className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10">
                      Delete?
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Delete ${template.name}`}
                      onClick={() => setConfirmingId(template.id)}
                      className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-opacity hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            )}
            <button
              type="button"
              disabled={!hasNodes}
              onClick={() => {
                setOpen(false);
                setSaveOpen(true);
              }}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-40">
              <Plus size={14} className="text-muted-foreground" />
              Save current diagram...
            </button>

            <div className="my-1 h-px bg-border" />

            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Scenario templates
            </p>
            {builtInTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleInsertBuiltIn(template)}
                className={rowClass}>
                <span className="text-sm font-medium text-foreground">
                  {template.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {template.description}
                </span>
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="px-2 py-1.5 text-xs text-destructive">
              {error}
            </p>
          )}
        </PopoverContent>
      </Popover>

      {saveOpen && <SaveTemplateDialog onClose={() => setSaveOpen(false)} />}
    </>
  );
}
