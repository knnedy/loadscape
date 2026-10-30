export type ParticleKind = "ok" | "downstream" | "rejected" | "blocked";

export interface Particle {
  distance: number;
  kind: ParticleKind;
  retry: boolean;
  burst: number | null;
}

export interface EdgeParticles {
  particles: Particle[];
  spawnCarry: number;
  rejectedCarry: number;
  downstreamCarry: number;
  retryCarry: number;
  blockedCarry: number;
}

export interface EdgeDrive {
  length: number;
  flow: number;
  retry: number;
  blocked: number;
  failed: number;
  rejected: number;
  queueFill: number;
}

export const PARTICLE_SPEED = 140;
export const MAX_PARTICLES_PER_EDGE = 40;
export const BURST_SECONDS = 0.3;
export const REJECT_STOP_MARGIN = 10;

const MAX_SPAWN_RATE = 12;
const MIN_FLOW = 0.05;
const MIN_SPEED_FACTOR = 0.15;
const EPSILON = 1e-9;

export function smoothstep(value: number): number {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
}

// Particles per second. They represent the flow and are not individual
// requests, so the rate follows the logarithm of the flow and is capped.
export function spawnRate(flow: number): number {
  if (!(flow >= MIN_FLOW)) return 0;
  return Math.min(MAX_SPAWN_RATE, 2 + 3 * Math.log10(1 + flow));
}

// Particles slow down over the last 60% of an edge into a queue as it fills,
// so those behind catch up and bunch together. Never fully stops.
export function speedFactor(progress: number, queueFill: number): number {
  const fill = Math.min(1, Math.max(0, queueFill));
  const ramp = smoothstep((progress - 0.4) / 0.6);
  return Math.max(MIN_SPEED_FACTOR, 1 - 0.85 * fill * ramp);
}

// Error diffusion: the share of blocked, rejected and downstream particles
// over any run of spawns matches the engine's shares exactly, with no
// randomness. A particle can only be one kind, so a share that fires on the
// same spawn as another waits for the next one.
export function nextKind(
  state: Pick<
    EdgeParticles,
    "rejectedCarry" | "downstreamCarry" | "blockedCarry"
  >,
  rejectedShare: number,
  downstreamShare: number,
  blockedShare = 0,
): ParticleKind {
  state.blockedCarry += blockedShare;
  state.rejectedCarry += rejectedShare;
  state.downstreamCarry += downstreamShare;
  if (state.blockedCarry >= 1 - EPSILON) {
    state.blockedCarry -= 1;
    return "blocked";
  }
  if (state.rejectedCarry >= 1 - EPSILON) {
    state.rejectedCarry -= 1;
    return "rejected";
  }
  if (state.downstreamCarry >= 1 - EPSILON) {
    state.downstreamCarry -= 1;
    return "downstream";
  }
  return "ok";
}

// The same diffusion for retries: over any run of spawns, the share of
// retry particles matches the retry share of the edge's attempts.
export function nextRetry(
  state: Pick<EdgeParticles, "retryCarry">,
  retryShare: number,
): boolean {
  state.retryCarry += retryShare;
  if (state.retryCarry >= 1 - EPSILON) {
    state.retryCarry -= 1;
    return true;
  }
  return false;
}

const share = (part: number, whole: number) =>
  whole > 0 ? Math.min(1, Math.max(0, part / whole)) : 0;

export function createEdgeParticles(): EdgeParticles {
  return {
    particles: [],
    spawnCarry: 0,
    rejectedCarry: 0,
    downstreamCarry: 0,
    retryCarry: 0,
    blockedCarry: 0,
  };
}

// Mutates `state` in place: it runs for every edge on every animation frame.
// Every share is taken against all attempts, those that reached the target
// and those a circuit breaker stopped, so particles stand for both.
export function advanceEdgeParticles(
  state: EdgeParticles,
  drive: EdgeDrive,
  seconds: number,
): void {
  const { length, flow, blocked, queueFill } = drive;
  const attempts = flow + blocked;
  const blockedShare = share(blocked, attempts);
  const rejectedShare = share(drive.rejected, attempts);
  const downstreamShare = share(
    Math.max(0, drive.failed - drive.rejected),
    attempts,
  );
  const retryShare = share(drive.retry, attempts);

  state.spawnCarry += spawnRate(attempts) * seconds;
  while (
    state.spawnCarry >= 1 &&
    state.particles.length < MAX_PARTICLES_PER_EDGE
  ) {
    state.spawnCarry -= 1;
    const kind = nextKind(state, rejectedShare, downstreamShare, blockedShare);
    state.particles.push({
      distance: 0,
      kind,
      retry: nextRetry(state, retryShare),
      burst: kind === "blocked" ? 0 : null,
    });
  }
  if (state.spawnCarry >= 1) state.spawnCarry -= Math.floor(state.spawnCarry);

  const alive: Particle[] = [];
  for (const particle of state.particles) {
    if (particle.burst !== null) {
      particle.burst += seconds;
      if (particle.burst < BURST_SECONDS) alive.push(particle);
      continue;
    }

    const progress = length > 0 ? particle.distance / length : 1;
    particle.distance +=
      PARTICLE_SPEED * speedFactor(progress, queueFill) * seconds;

    if (particle.kind === "rejected") {
      const stop = Math.max(0, length - REJECT_STOP_MARGIN);
      if (particle.distance >= stop) {
        particle.distance = stop;
        particle.burst = 0;
      }
      alive.push(particle);
    } else if (particle.distance < length) {
      alive.push(particle);
    }
  }
  state.particles = alive;
}
