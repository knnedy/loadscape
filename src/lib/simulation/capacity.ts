import type { NodeCategory } from "@/lib/types/topology";
import { presetFor } from "./catalog-presets";
import { PRESETS } from "./presets";

const SCALES = [
  { label: "÷10", factor: 0.1 },
  { label: "Default", factor: 1 },
  { label: "×10", factor: 10 },
] as const;

export interface CapacityTier {
  label: string;
  value: number;
  isDefault: boolean;
}

const fullFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function defaultCapacity(
  componentId: string,
  category: NodeCategory,
): number {
  return PRESETS[presetFor(componentId, category)].capacity;
}

export function limitsCapacity(
  componentId: string,
  category: NodeCategory,
): boolean {
  return Number.isFinite(defaultCapacity(componentId, category));
}

export function capacityTiers(base: number): CapacityTier[] {
  return SCALES.map(({ label, factor }) => ({
    label,
    value: Math.max(1, Math.round(base * factor)),
    isDefault: factor === 1,
  }));
}

export function capacityOverride(
  value: number,
  base: number,
): number | undefined {
  return value === base ? undefined : value;
}

export function formatRate(value: number): string {
  return fullFormat.format(value);
}

export function formatRateCompact(value: number): string {
  return compactFormat.format(value);
}
