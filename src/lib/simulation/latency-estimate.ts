// Latency is carried as a mean and a variance, in milliseconds and
// milliseconds squared. Independent steps in series add both, which is what
// makes percentiles along a path computable.
export interface Moments {
  mean: number;
  variance: number;
}

export interface LatencyEstimate {
  p50: number;
  p95: number;
  p99: number;
}

export const ZERO: Moments = { mean: 0, variance: 0 };

const LARGE_SHAPE = 500;
const MIN_SHAPE = 0.01;
const DETERMINISTIC = 1e-9;
const SERIES_LIMIT = 500;
const FRACTION_LIMIT = 500;
const EPSILON = 1e-12;
const TINY = 1e-300;
const BISECTION_STEPS = 60;

const LANCZOS = [
  76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
  0.1208650973866179e-2, -0.5395239384953e-5,
];

export function constant(value: number): Moments {
  return { mean: Math.max(0, value), variance: 0 };
}

// The time in an M/M/1 queue is exponentially distributed, so its standard
// deviation equals its mean.
export function exponential(mean: number): Moments {
  const m = Math.max(0, mean);
  return { mean: m, variance: m * m };
}

// Two independent steps one after the other.
export function sum(a: Moments, b: Moments): Moments {
  return { mean: a.mean + b.mean, variance: a.variance + b.variance };
}

// The same independent step done `count` times in a row.
export function repeat(moments: Moments, count: number): Moments {
  return { mean: moments.mean * count, variance: moments.variance * count };
}

// With the given probability the latency is `moments`, and otherwise it is 0:
// a cache hit that never reaches the next hop, for example.
export function thin(moments: Moments, probability: number): Moments {
  const p = Math.min(1, Math.max(0, probability));
  return {
    mean: p * moments.mean,
    variance: p * moments.variance + p * (1 - p) * moments.mean ** 2,
  };
}

// A request that takes one of several paths, picked by weight.
export function mixture(
  parts: { weight: number; moments: Moments }[],
): Moments {
  const total = parts.reduce((s, part) => s + Math.max(0, part.weight), 0);
  if (!(total > 0)) return ZERO;

  let mean = 0;
  let second = 0;
  for (const { weight, moments } of parts) {
    const share = Math.max(0, weight) / total;
    mean += share * moments.mean;
    second += share * (moments.variance + moments.mean ** 2);
  }
  return { mean, variance: Math.max(0, second - mean ** 2) };
}

// The latency of a call that may be retried. Every attempt takes `attempt`
// and fails with probability `failShare`; a failed attempt is followed by a
// fixed wait before the next one, with one retry allowed per entry in
// `delaysMs`. The number of retries used is geometric and capped, so the call
// is a mixture over that number: n + 1 attempts and the first n waits.
export function withRetries(
  attempt: Moments,
  failShare: number,
  delaysMs: number[],
): Moments {
  if (delaysMs.length === 0) return attempt;

  const fail = Number.isFinite(failShare)
    ? Math.min(1, Math.max(0, failShare))
    : 0;
  const parts: { weight: number; moments: Moments }[] = [];
  let reach = 1;
  let waited = 0;

  for (let n = 0; n <= delaysMs.length; n++) {
    const last = n === delaysMs.length;
    const weight = last ? reach : reach * (1 - fail);
    if (weight > 0) {
      parts.push({
        weight,
        moments: sum(repeat(attempt, n + 1), constant(waited)),
      });
    }
    reach *= fail;
    if (!last) waited += Math.max(0, delaysMs[n]);
  }

  return parts.length === 1 ? parts[0].moments : mixture(parts);
}

function logGamma(x: number): number {
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let series = 1.000000000190015;
  for (const coefficient of LANCZOS) {
    y += 1;
    series += coefficient / y;
  }
  return -tmp + Math.log((2.5066282746310005 * series) / x);
}

// Regularised lower incomplete gamma by its series, for x below shape + 1.
function gammaSeries(shape: number, x: number): number {
  let ap = shape;
  let term = 1 / shape;
  let total = term;
  for (let n = 0; n < SERIES_LIMIT; n++) {
    ap += 1;
    term *= x / ap;
    total += term;
    if (Math.abs(term) < Math.abs(total) * EPSILON) break;
  }
  return total * Math.exp(-x + shape * Math.log(x) - logGamma(shape));
}

// The upper incomplete gamma by a continued fraction, for larger x.
function gammaFraction(shape: number, x: number): number {
  let b = x + 1 - shape;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= FRACTION_LIMIT; i++) {
    const an = -i * (i - shape);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }
  return Math.exp(-x + shape * Math.log(x) - logGamma(shape)) * h;
}

function gammaP(shape: number, x: number): number {
  if (x <= 0) return 0;
  return x < shape + 1 ? gammaSeries(shape, x) : 1 - gammaFraction(shape, x);
}

// Abramowitz and Stegun 26.2.23, accurate to about 5e-4. Only used for very
// large shapes, where the gamma is nearly normal.
function normalQuantile(p: number): number {
  if (p === 0.5) return 0;
  const tail = Math.min(p, 1 - p);
  const t = Math.sqrt(-2 * Math.log(tail));
  const z =
    t -
    (2.515517 + 0.802853 * t + 0.010328 * t * t) /
      (1 + 1.432788 * t + 0.189269 * t * t + 0.001308 * t * t * t);
  return p < 0.5 ? -z : z;
}

// The point below which a gamma variable with unit scale falls with
// probability p.
export function gammaQuantile(shape: number, p: number): number {
  if (!(p > 0)) return 0;
  if (p >= 1) return Infinity;

  if (shape > LARGE_SHAPE) {
    const c = 1 / (9 * shape);
    const base = 1 - c + normalQuantile(p) * Math.sqrt(c);
    return shape * Math.max(0, base) ** 3;
  }

  let high = Math.max(1, shape);
  for (let i = 0; i < 80 && gammaP(shape, high) < p; i++) high *= 2;

  let low = 0;
  for (let i = 0; i < BISECTION_STEPS; i++) {
    const middle = (low + high) / 2;
    if (gammaP(shape, middle) < p) low = middle;
    else high = middle;
  }
  return (low + high) / 2;
}

// A gamma distribution is fitted to the mean and variance, which is exact for
// a single exponential and for equal exponentials in series.
export function quantile(moments: Moments, p: number): number {
  const { mean, variance } = moments;
  if (!(mean > 0)) return 0;
  if (!(variance > mean * mean * DETERMINISTIC)) return mean;

  const shape = Math.max(MIN_SHAPE, (mean * mean) / variance);
  return (variance / mean) * gammaQuantile(shape, p);
}

export function estimateLatency(moments: Moments): LatencyEstimate {
  return {
    p50: quantile(moments, 0.5),
    p95: quantile(moments, 0.95),
    p99: quantile(moments, 0.99),
  };
}
