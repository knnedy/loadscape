"use client";

import {
  capacityOverride,
  capacityTiers,
  formatRate,
} from "@/lib/simulation/capacity";
import { cn } from "@/lib/utils";
import { Callout, Field, Stepper, UnitInput } from "./field-parts";

const MIN_INSTANCES = 1;
const MAX_INSTANCES = 10_000;

const DEFAULT_CAPACITY_HINT =
  "Sustained throughput per instance. Load above this is shed, or buffered if a buffer is set.";
const DEFAULT_INSTANCES_HINT =
  "Identical replicas behind this node. Total capacity = capacity × instances.";

interface CapacityFieldProps {
  idPrefix: string;
  base?: number;
  capacity?: number;
  capacityMixed?: boolean;
  capacityOverridden: boolean;
  instances?: number;
  instancesMixed?: boolean;
  capacityLabel?: string;
  capacityHint?: string;
  instancesLabel?: string;
  instancesHint?: string;
  totalLabel?: string;
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
  capacityLabel = "Capacity",
  capacityHint = DEFAULT_CAPACITY_HINT,
  instancesLabel = "Instances",
  instancesHint = DEFAULT_INSTANCES_HINT,
  totalLabel = "Total capacity",
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

  const resolve = (value: number) =>
    base === undefined ? value : capacityOverride(value, base);

  function setCapacity(next: number | undefined) {
    if (!capacityMixed && next === capacity) return;
    onCapacityChange(next);
  }

  function setInstances(next: number | undefined) {
    const resolved = next === MIN_INSTANCES ? undefined : next;
    if (!instancesMixed && resolved === instances) return;
    onInstancesChange(resolved);
  }

  return (
    <div className="flex flex-col gap-4">
      <Field
        id={`${idPrefix}-capacity`}
        label={capacityLabel}
        hint={capacityHint}
        changed={capacityOverridden}
        onReset={() => onCapacityChange(undefined)}>
        <UnitInput
          id={`${idPrefix}-capacity`}
          value={capacity}
          base={base}
          mixed={capacityMixed}
          unit="req/s"
          min={1}
          onChange={setCapacity}
        />
        {tiers.length > 0 && (
          <div className="flex gap-1.5">
            {tiers.map((tier) => {
              const active = !capacityMixed && effectiveCapacity === tier.value;
              return (
                <button
                  key={tier.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCapacity(resolve(tier.value))}
                  className={cn(
                    "flex flex-1 flex-col items-center rounded-md border px-2 py-1 transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}>
                  <span className="text-xs">{tier.label}</span>
                  <span className="font-mono text-[11px]">
                    {formatRate(tier.value)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <Field
        id={`${idPrefix}-instances`}
        label={instancesLabel}
        hint={instancesHint}
        changed={instancesMixed || instances !== undefined}
        onReset={() => onInstancesChange(undefined)}>
        <Stepper
          id={`${idPrefix}-instances`}
          value={instancesMixed ? undefined : (instances ?? MIN_INSTANCES)}
          placeholder={instancesMixed ? "Mixed" : undefined}
          min={MIN_INSTANCES}
          max={MAX_INSTANCES}
          decrementLabel="Remove one instance"
          incrementLabel="Add one instance"
          onChange={setInstances}
        />
      </Field>

      {total !== undefined && (
        <Callout>
          {totalLabel}{" "}
          <span className="font-mono text-foreground">
            {formatRate(total)} req/s
          </span>
        </Callout>
      )}
    </div>
  );
}
