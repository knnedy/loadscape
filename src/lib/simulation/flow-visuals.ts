const BASE_WIDTH = 1.5;
const MAX_EXTRA_WIDTH = 3;
const WIDTH_PER_DECADE = 0.75;
const MIN_TINT_SHARE = 0.02;
const TINT_GAIN = 1.5;

export interface EdgeTints {
  rejected: number;
  downstream: number;
}

// Flow spans several orders of magnitude, so width follows the logarithm of
// the rate: about 3px at 100 req/s, 3.75px at 1,000 and 4.5px from 10,000.
export function strokeWidthFor(rate: number): number {
  if (!(rate > 0)) return BASE_WIDTH;
  return (
    BASE_WIDTH +
    Math.min(MAX_EXTRA_WIDTH, Math.log10(1 + rate) * WIDTH_PER_DECADE)
  );
}

// How far to pull an edge's colour towards a failure colour, as a percent.
// Under 2% of the flow failing is not worth showing, and the gain makes a
// moderate failure share clearly visible without waiting for it to be total.
export function failureTint(flow: number, failed: number): number {
  if (!(flow > 0) || !(failed > 0)) return 0;
  const share = Math.min(1, failed / flow);
  if (share < MIN_TINT_SHARE) return 0;
  return Math.min(100, Math.round(share * TINT_GAIN * 100));
}

// Splits an edge's failures by where they start: the part its target refuses
// itself, and the part that fails further downstream.
export function failureTints(
  flow: number,
  failed: number,
  rejected: number,
): EdgeTints {
  const refused = Math.min(Math.max(0, rejected), Math.max(0, failed));
  return {
    rejected: failureTint(flow, refused),
    downstream: failureTint(flow, failed - refused),
  };
}
