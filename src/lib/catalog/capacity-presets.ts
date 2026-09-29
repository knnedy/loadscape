// Requests per second. Uniform across categories for now.
export const capacityPresets = [
  { label: "Small", value: 100 },
  { label: "Medium", value: 1_000 },
  { label: "Large", value: 10_000 },
] as const;
