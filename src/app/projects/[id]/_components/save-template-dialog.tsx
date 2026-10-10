"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MAX_TEMPLATE_DESCRIPTION_LENGTH,
  MAX_TEMPLATE_NAME_LENGTH,
} from "@/lib/utils";
import { useTopologyStoreApi } from "../_store/topology-provider";
import { saveAsTemplate, type TemplateActionError } from "../template-actions";

export function describeTemplateError(error: TemplateActionError) {
  switch (error) {
    case "unauthorized":
      return "Your session has expired. Sign in again in another tab, then retry.";
    case "not_found":
      return "That template no longer exists.";
    case "limit":
      return "You've reached the limit of 50 templates. Delete one first.";
    case "invalid":
      return `Use a name up to ${MAX_TEMPLATE_NAME_LENGTH} characters and a description up to ${MAX_TEMPLATE_DESCRIPTION_LENGTH}.`;
  }
}

export function SaveTemplateDialog({ onClose }: { onClose: () => void }) {
  const storeApi = useTopologyStoreApi();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const { nodes, edges } = storeApi.getState();
    startTransition(async () => {
      const result = await saveAsTemplate(name, description, { nodes, edges });
      if (result.ok) {
        onClose();
        return;
      }
      setError(describeTemplateError(result.error));
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <DialogDescription>
              The whole diagram is saved to your account and can be inserted
              into any project.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-name">Name</Label>
            <Input
              id="template-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_TEMPLATE_NAME_LENGTH}
              placeholder="e.g. URL shortener"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="template-description">
              Description{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={MAX_TEMPLATE_DESCRIPTION_LENGTH}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={pending || name.trim().length === 0}>
              Save template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
