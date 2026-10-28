"use client";

import type { ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { NumberInput } from "./number-input";

const NO_SPINNER =
  "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

const STEP_BUTTON =
  "rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40";

export const toPercent = (ratio: number) => Math.round(ratio * 1000) / 10;

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-5 border-t border-border pt-4">
      <h4 className="mb-3 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function Field({
  id,
  label,
  hint,
  changed = false,
  onReset,
  children,
}: {
  id?: string;
  label: string;
  hint?: string;
  changed?: boolean;
  onReset?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label
          htmlFor={id}
          className="flex items-center gap-1.5 text-xs font-medium">
          {label}
          {changed && (
            <span
              title="Changed from the default"
              className="size-1.5 rounded-full bg-primary"
            />
          )}
        </Label>
        {changed && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Reset
          </button>
        )}
      </div>
      {children}
      {hint && (
        <p className="text-xs leading-snug text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

export function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "rounded-lg border px-2.5 py-2 text-xs leading-snug",
        tone === "warning"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
          : "border-border bg-muted/50 text-muted-foreground",
      )}>
      {children}
    </p>
  );
}

interface UnitInputProps {
  id: string;
  // The saved override, or undefined when the default applies.
  value: number | undefined;
  base?: number;
  mixed?: boolean;
  unit: string;
  min: number;
  max?: number;
  step?: number;
  onChange: (value: number | undefined) => void;
}

// Shows the value in use, with its unit inside the box. Typing the default
// clears the override, so only changed values are stored.
export function UnitInput({
  id,
  value,
  base,
  mixed = false,
  unit,
  min,
  max,
  step,
  onChange,
}: UnitInputProps) {
  function commit(next: number | undefined) {
    const resolved = base !== undefined && next === base ? undefined : next;
    if (!mixed && resolved === value) return;
    onChange(resolved);
  }

  return (
    <div className="relative">
      <NumberInput
        id={id}
        value={mixed ? undefined : (value ?? base)}
        min={min}
        max={max}
        step={step}
        placeholder={mixed ? "Mixed" : undefined}
        onCommit={commit}
        className={cn("pr-16 font-mono", NO_SPINNER)}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
        {unit}
      </span>
    </div>
  );
}

interface StepperProps {
  id: string;
  value: number | undefined;
  placeholder?: string;
  min: number;
  max: number;
  decrementLabel: string;
  incrementLabel: string;
  onChange: (value: number | undefined) => void;
}

export function Stepper({
  id,
  value,
  placeholder,
  min,
  max,
  decrementLabel,
  incrementLabel,
  onChange,
}: StepperProps) {
  const current = value ?? min;
  const move = (delta: number) =>
    onChange(Math.min(max, Math.max(min, current + delta)));

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={decrementLabel}
        disabled={current <= min}
        onClick={() => move(-1)}
        className={STEP_BUTTON}>
        <Minus size={12} />
      </button>
      <NumberInput
        id={id}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onCommit={onChange}
        className={cn("text-center font-mono", NO_SPINNER)}
      />
      <button
        type="button"
        aria-label={incrementLabel}
        disabled={current >= max}
        onClick={() => move(1)}
        className={STEP_BUTTON}>
        <Plus size={12} />
      </button>
    </div>
  );
}

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}) {
  const current = options.find((option) => option.value === value);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
              option.value === value
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-accent",
            )}>
            {option.label}
          </button>
        ))}
      </div>
      {current?.description && (
        <p className="text-xs leading-snug text-muted-foreground">
          {current.description}
        </p>
      )}
    </div>
  );
}
