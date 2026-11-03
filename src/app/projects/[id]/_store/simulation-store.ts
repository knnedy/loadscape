import { createStore } from "zustand/vanilla";
import { orderGraph } from "@/lib/simulation/graph";
import {
  STEADY,
  loadFactorAt,
  normalizeProfile,
  type LoadProfile,
} from "@/lib/simulation/load-profile";
import { DT, createState, step } from "@/lib/simulation/step";
import type { Frame, SimGraph, SimState } from "@/lib/simulation/types";

export const SPEEDS = [1, 5, 20, 100] as const;
export type Speed = (typeof SPEEDS)[number];

export type RunStatus = "idle" | "running" | "paused" | "finished";

export const RUN_LENGTH_SECONDS = 600;
export const TICKS_PER_SECOND = Math.round(1 / DT);

const RUN_LENGTH_TICKS = RUN_LENGTH_SECONDS * TICKS_PER_SECOND;

export interface SimulationState {
  status: RunStatus;
  speed: Speed;
  // Run settings, like speed: session state that survives Reset and edits to
  // the diagram, and is never saved with it.
  profile: LoadProfile;
  // Ids of killed nodes. Replaced, never mutated, so selectors can compare
  // by reference.
  down: ReadonlySet<string>;
  graph: SimGraph | null;
  order: string[] | null;
  signature: string;
  sim: SimState;
  frame: Frame | null;
  history: Frame[];
  configure: (graph: SimGraph) => void;
  play: () => void;
  pause: () => void;
  stepOnce: () => void;
  reset: () => void;
  setSpeed: (speed: Speed) => void;
  setProfile: (profile: LoadProfile) => void;
  kill: (id: string) => void;
  revive: (id: string) => void;
  toggleDown: (id: string) => void;
  reviveAll: () => void;
  advance: (ticks: number) => void;
}

export type SimulationStore = ReturnType<typeof createSimulationStore>;

function fresh(): Pick<SimulationState, "sim" | "frame" | "history"> {
  return { sim: createState(), frame: null, history: [] };
}

function signatureOf(graph: SimGraph): string {
  const nodes = graph.nodes.map((node) => node.id).sort();
  const edges = graph.edges
    .map((edge) => `${edge.id}:${edge.source}>${edge.target}`)
    .sort();
  return `${nodes.join(",")}|${edges.join(",")}`;
}

export function createSimulationStore() {
  return createStore<SimulationState>()((set, get) => ({
    status: "idle",
    speed: 1,
    profile: STEADY,
    down: new Set<string>(),
    graph: null,
    order: null,
    signature: "",
    ...fresh(),
    configure: (graph) => {
      const signature = signatureOf(graph);
      if (signature === get().signature) {
        set({ graph });
        return;
      }

      // A fault belongs to a node that still exists, so a deleted node's
      // fault goes with it.
      const killable = new Set(
        graph.nodes.filter((node) => node.role !== "source").map((n) => n.id),
      );
      const previous = get().down;
      const kept = [...previous].filter((id) => killable.has(id));

      const ordered = orderGraph(graph);
      const { status } = get();
      const inProgress = status === "running" || status === "paused";
      set({
        graph,
        signature,
        down: kept.length === previous.size ? previous : new Set(kept),
        order: ordered.ok ? ordered.order : null,
        status: ordered.ok && inProgress ? status : "idle",
        ...fresh(),
      });
    },
    play: () => {
      const { order, status } = get();
      if (!order) return;
      if (status === "finished") set(fresh());
      set({ status: "running" });
    },
    pause: () => {
      if (get().status === "running") set({ status: "paused" });
    },
    stepOnce: () => {
      const { order, status } = get();
      if (!order || status === "finished") return;
      set({ status: "paused" });
      get().advance(1);
    },
    reset: () => set({ status: "idle", ...fresh() }),
    setSpeed: (speed) => set({ speed }),
    setProfile: (profile) => set({ profile: normalizeProfile(profile) }),
    kill: (id) => {
      const { graph, down } = get();
      const node = graph?.nodes.find((candidate) => candidate.id === id);
      if (!node || node.role === "source" || down.has(id)) return;
      set({ down: new Set(down).add(id) });
    },
    revive: (id) => {
      const { down } = get();
      if (!down.has(id)) return;
      const next = new Set(down);
      next.delete(id);
      set({ down: next });
    },
    toggleDown: (id) => {
      if (get().down.has(id)) get().revive(id);
      else get().kill(id);
    },
    reviveAll: () => {
      if (get().down.size === 0) return;
      set({ down: new Set<string>() });
    },
    advance: (ticks) => {
      const { graph, order, status, profile, down } = get();
      if (!graph || !order || status === "finished") return;

      let sim = get().sim;
      let frame = get().frame;
      let finished = false;
      const recorded: Frame[] = [];

      for (let i = 0; i < ticks; i++) {
        const load = loadFactorAt(profile, sim.tick);
        const result = step(graph, order, sim, load, down);
        sim = result.state;
        frame = result.frame;
        if (sim.tick % TICKS_PER_SECOND === 0) recorded.push(frame);
        if (sim.tick >= RUN_LENGTH_TICKS) {
          finished = true;
          break;
        }
      }

      set({
        sim,
        frame,
        status: finished ? "finished" : status,
        ...(recorded.length > 0
          ? { history: [...get().history, ...recorded] }
          : {}),
      });
    },
  }));
}
