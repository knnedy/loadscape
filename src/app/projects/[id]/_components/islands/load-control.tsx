"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatRateCompact } from "@/lib/simulation/capacity";
import {
  STEADY,
  peakFactor,
  profileLabel,
  startingIn,
  type LoadProfile,
} from "@/lib/simulation/load-profile";
import { cn } from "@/lib/utils";
import {
  useSimulationStore,
  useSimulationStoreApi,
} from "../../_store/simulation-provider";
import { TICKS_PER_SECOND } from "../../_store/simulation-store";
import {
  Callout,
  Field,
  Segmented,
  UnitInput,
  type SegmentOption,
} from "../inspector/field-parts";

type Shape = LoadProfile["kind"];

interface Draft {
  shape: Shape;
  startsIn: number;
  durationS: number;
  factor: number;
  from: number;
  to: number;
}

const INITIAL: Draft = {
  shape: "spike",
  startsIn: 0,
  durationS: 10,
  factor: 4,
  from: 1,
  to: 5,
};

const SHAPES: SegmentOption<Shape>[] = [
  {
    value: "constant",
    label: "Steady",
    description: "Every client sends at its configured rate.",
  },
  {
    value: "spike",
    label: "Spike",
    description:
      "A temporary multiplier on every client's rate, then back to normal. Like a flash sale.",
  },
  {
    value: "step",
    label: "Surge",
    description:
      "A sustained multiplier from a point onward. Like a traffic migration.",
  },
  {
    value: "ramp",
    label: "Ramp",
    description:
      "Moves the multiplier linearly over a period, then holds it. Like a gradual rollout.",
  },
];

function toProfile(draft: Draft): LoadProfile {
  switch (draft.shape) {
    case "constant":
      return STEADY;
    case "spike":
      return {
        kind: "spike",
        startS: draft.startsIn,
        durationS: draft.durationS,
        factor: draft.factor,
      };
    case "step":
      return { kind: "step", startS: draft.startsIn, factor: draft.factor };
    case "ramp":
      return {
        kind: "ramp",
        startS: draft.startsIn,
        durationS: draft.durationS,
        from: draft.from,
        to: draft.to,
      };
  }
}

function Param({
  id,
  label,
  hint,
  value,
  unit,
  max,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  unit: string;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field id={id} label={label} hint={hint}>
      <UnitInput
        id={id}
        value={value}
        unit={unit}
        min={0}
        max={max}
        step={0.1}
        onChange={(next) => {
          if (next !== undefined) onChange(next);
        }}
      />
    </Field>
  );
}

export function LoadControl() {
  const simulation = useSimulationStoreApi();
  const profile = useSimulationStore((s) => s.profile);
  const idle = useSimulationStore((s) => s.status === "idle");
  const baseline = useSimulationStore(
    (s) =>
      s.graph?.nodes.reduce(
        (sum, node) => (node.role === "source" ? sum + node.rps : sum),
        0,
      ) ?? 0,
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(INITIAL);

  const active = profile.kind !== "constant";
  const peak = peakFactor(toProfile(draft));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  function apply(next: LoadProfile) {
    const nowS = simulation.getState().sim.tick / TICKS_PER_SECOND;
    simulation.getState().setProfile(startingIn(next, nowS));
    setOpen(false);
  }

  const spiky = draft.shape === "spike";
  const ramping = draft.shape === "ramp";
  const multiplied = spiky || draft.shape === "step";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "flex h-7 items-center gap-1.5 rounded-lg px-2 text-xs font-medium transition-colors hover:bg-accent",
          active
            ? "bg-primary/12 text-primary"
            : "text-muted-foreground hover:text-accent-foreground",
        )}>
        <Zap size={13} />
        {active ? profileLabel(profile) : "Load"}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={12} className="w-80 p-3">
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
          Load profile
        </p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">
          Multiplies every client&apos;s request rate over simulated time.
          Applies from the next tick.
        </p>

        <div className="mt-3 flex flex-col gap-4">
          <Segmented
            label="Load shape"
            value={draft.shape}
            options={SHAPES}
            onChange={(shape) => set("shape", shape)}
          />

          {draft.shape !== "constant" && (
            <>
              <Param
                id="load-start"
                label="Starts in"
                hint={
                  idle
                    ? "Seconds after the start of the run."
                    : "Seconds from now on the simulated clock."
                }
                value={draft.startsIn}
                unit="s"
                max={3600}
                onChange={(value) => set("startsIn", value)}
              />
              {(spiky || ramping) && (
                <Param
                  id="load-duration"
                  label="Duration"
                  value={draft.durationS}
                  unit="s"
                  max={3600}
                  onChange={(value) => set("durationS", value)}
                />
              )}
              {multiplied && (
                <Param
                  id="load-factor"
                  label="Multiplier"
                  hint="0× models a demand outage."
                  value={draft.factor}
                  unit="×"
                  max={100}
                  onChange={(value) => set("factor", value)}
                />
              )}
              {ramping && (
                <div className="grid grid-cols-2 gap-3">
                  <Param
                    id="load-from"
                    label="From"
                    value={draft.from}
                    unit="×"
                    max={100}
                    onChange={(value) => set("from", value)}
                  />
                  <Param
                    id="load-to"
                    label="To"
                    value={draft.to}
                    unit="×"
                    max={100}
                    onChange={(value) => set("to", value)}
                  />
                </div>
              )}
              {baseline > 0 && (
                <Callout>
                  Client demand{" "}
                  <span className="font-mono text-foreground">
                    {formatRateCompact(baseline)} req/s
                  </span>{" "}
                  → peak{" "}
                  <span className="font-mono text-foreground">
                    {formatRateCompact(baseline * peak)} req/s
                  </span>{" "}
                  ({Math.round(peak * 100) / 100}×).
                </Callout>
              )}
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => apply(toProfile(draft))}
            className="h-8 flex-1 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90">
            Apply
          </button>
          {active && (
            <button
              type="button"
              onClick={() => apply(STEADY)}
              className="h-8 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
