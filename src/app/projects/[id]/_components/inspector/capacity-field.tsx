"use client";

import { Minus, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  capacityOverride,
  capacityTiers,
  formatRate,
} from "@/lib/simulation/capacity";
import { cn } from "@/lib/utils";
import { NumberInput } from "./number-input";

const MIN_INSTANCES = 1;

interface CapacityFieldProps {
  idPrefix: string;
  base?: number;
  capacity?: number;
  capacityMixed?: boolean;
  capacityOverridden: boolean;
  instances?: number;
  instancesMixed?: boolean;
  onCapacityChange: (value: number | undefined) => void;
  onInstancesChange: (value: number | undefined) => void;
}

export function CapacityField({
  idPrefix,
  base,
  capacity,
  capacityMixed = false,
  capacityOverridden,
  instances,
  instancesMixed = false,
  onCapacityChange,
  onInstancesChange,
}: CapacityFieldProps) {
  const tiers = base === undefined ? [] : capacityTiers(base);
  const effectiveCapacity = capacityMixed ? undefined : (capacity ?? base);
  const effectiveInstances = instancesMixed
    ? undefined
    : (instances ?? MIN_INSTANCES);
  const total =
    effectiveCapacity !== undefined && effectiveInstances !== undefined
      ? effectiveCapacity * effectiveInstances
      : undefined;

  function setCapacity(next: number | undefined) {
    const resolved =
      next === undefined || base === undefined
        ? next
        : capacityOverride(next, base);
    if (!capacityMixed && resolved === capacity) return;
    onCapacityChange(resolved);
  }

  function setInstances(next: number | undefined) {
    const resolved = next === MIN_INSTANCES ? undefined : next;
    if (!instancesMixed && resolved === instances) return;
    onInstancesChange(resolved);
  }

  const stepInstances = (delta: number) =>
    setInstances(Math.max(MIN_INSTANCES, (instances ?? MIN_INSTANCES) + delta));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-capacity`} className="text-xs">
          Capacity per instance (req/sec)
        </Label>
        <NumberInput
          id={`${idPrefix}-capacity`}
          value={capacity}
          min={1}
          placeholder={
            capacityMixed
              ? "Mixed"
              : base === undefined
                ? undefined
                : formatRate(base)
          }
          onCommit={setCapacity}
          className="font-mono"
        />
        {tiers.length > 0 && (
          <div className="mt-1 flex gap-1.5">
            {tiers.map((tier) => (
              <button
                key={tier.label}
                type="button"
                onClick={() => setCapacity(tier.value)}
                className={cn(
                  "flex flex-1 flex-col items-center rounded-md border px-2 py-1 transition-colors",
                  !capacityMixed && effectiveCapacity === tier.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-accent",
                )}>
                <span className="text-xs">{tier.label}</span>
                <span className="font-mono text-[11px]">
                  {formatRate(tier.value)}
                </span>
              </button>
            ))}
          </div>
        )}
        {(base !== undefined || capacityOverridden) && (
          <p className="text-xs text-muted-foreground">
            {base !== undefined && `Default ${formatRate(base)}`}
            {capacityOverridden && (
              <>
                {base !== undefined && " · "}
                <button
                  type="button"
                  onClick={() => onCapacityChange(undefined)}
                  className="underline-offset-2 hover:text-foreground hover:underline">
                  {base !== undefined ? "Reset" : "Reset to defaults"}
                </button>
              </>
            )}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-instances`} className="text-xs">
          Instances
        </Label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Remove an instance"
            disabled={
              !instancesMixed && (instances ?? MIN_INSTANCES) <= MIN_INSTANCES
            }
            onClick={() => stepInstances(-1)}
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40">
            <Minus size={12} />
          </button>
          <NumberInput
            id={`${idPrefix}-instances`}
            value={instances}
            min={MIN_INSTANCES}
            placeholder={instancesMixed ? "Mixed" : String(MIN_INSTANCES)}
            onCommit={setInstances}
            className="text-center font-mono"
          />
          <button
            type="button"
            aria-label="Add an instance"
            onClick={() => stepInstances(1)}
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent">
            <Plus size={12} />
          </button>
        </div>
        {total !== undefined && (
          <p className="text-xs text-muted-foreground">
            Total{" "}
            <span className="font-mono text-foreground">
              {formatRate(total)}
            </span>{" "}
            req/sec
          </p>
        )}
      </div>
    </div>
  );
}
