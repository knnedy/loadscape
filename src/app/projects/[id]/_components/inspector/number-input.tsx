"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

interface NumberInputProps {
  id: string;
  value: number | undefined;
  min: number;
  max?: number;
  step?: number;
  placeholder?: string;
  className?: string;
  onCommit: (value: number | undefined) => void;
}

export function NumberInput({
  id,
  value,
  min,
  max,
  step,
  placeholder,
  className,
  onCommit,
}: NumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  function commit() {
    if (draft === null) return;
    const text = draft.trim();
    setDraft(null);
    if (text === "") {
      onCommit(undefined);
      return;
    }
    const parsed = Number(text);
    if (!Number.isFinite(parsed)) return;
    const bounded = Math.max(
      min,
      max === undefined ? parsed : Math.min(max, parsed),
    );
    onCommit(step === undefined ? Math.round(bounded) : bounded);
  }

  return (
    <Input
      id={id}
      type="number"
      min={min}
      max={max}
      step={step}
      value={draft ?? value ?? ""}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") setDraft(null);
      }}
      className={className}
    />
  );
}
