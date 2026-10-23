"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  disableSharing,
  enableSharing,
  regenerateShareLink,
  type ShareActionError,
} from "../../_actions/share-actions";
import { useTopologyStore } from "../../_store/topology-provider";

const COPIED_RESET_MS = 2000;

function describeError(error: ShareActionError) {
  switch (error) {
    case "unauthorized":
      return "Your session has expired. Sign in again in another tab, then retry.";
    case "not_found":
      return "That project no longer exists.";
    case "invalid":
      return "Something went wrong. Reload the page and try again.";
  }
}

function SharePanel({
  projectId,
  token,
  onTokenChange,
}: {
  projectId: string;
  token: string | null;
  onTokenChange: (token: string | null) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  const link = token ? `${window.location.origin}/share/${token}` : null;

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await enableSharing(projectId);
      if (!result.ok) {
        setError(describeError(result.error));
        return;
      }
      onTokenChange(result.token);
    });
  }

  function handleRegenerate() {
    setError(null);
    startTransition(async () => {
      const result = await regenerateShareLink(projectId);
      setConfirmingRegenerate(false);
      if (!result.ok) {
        setError(describeError(result.error));
        return;
      }
      onTokenChange(result.token);
    });
  }

  function handleStop() {
    setError(null);
    startTransition(async () => {
      const result = await disableSharing(projectId);
      setConfirmingRegenerate(false);
      if (!result.ok) {
        setError(describeError(result.error));
        return;
      }
      onTokenChange(null);
    });
  }

  async function handleCopy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(
        () => setCopied(false),
        COPIED_RESET_MS,
      );
    } catch {
      setError("Couldn't copy automatically. Select the link and copy it.");
    }
  }

  if (!link) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Sharing is off. Create a link and anyone who has it can view this
          diagram without signing in.
        </p>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={handleCreate}
          className="self-start">
          Create link
        </Button>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="share-link" className="text-xs">
          Link
        </Label>
        <div className="flex gap-1.5">
          <Input
            id="share-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            aria-label="Share link"
            className="h-8 font-mono text-xs"
          />
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCopy()}
            className="h-8 shrink-0 gap-1.5">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {confirmingRegenerate ? (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={handleRegenerate}
              className="rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10">
              Replace link?
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRegenerate(false)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent">
              Cancel
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingRegenerate(true)}
            className="rounded-md px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-accent">
            Regenerate link
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={handleStop}
          className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10">
          Stop sharing
        </button>
      </div>

      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function ShareDialog({
  projectId,
  initialToken,
}: {
  projectId: string;
  initialToken: string | null;
}) {
  const open = useTopologyStore((s) => s.activePanel === "share");
  const openPanel = useTopologyStore((s) => s.openPanel);
  const closePanel = useTopologyStore((s) => s.closePanel);
  const [token, setToken] = useState(initialToken);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) openPanel("share");
        else closePanel();
      }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share diagram</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this diagram. They can't edit it.
          </DialogDescription>
        </DialogHeader>
        <SharePanel
          projectId={projectId}
          token={token}
          onTokenChange={setToken}
        />
      </DialogContent>
    </Dialog>
  );
}
