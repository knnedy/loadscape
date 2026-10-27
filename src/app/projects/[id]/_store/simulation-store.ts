import { createStore } from "zustand/vanilla";
import { orderGraph } from "@/lib/simulation/graph";
import { DT, createState, step } from "@/lib/simulation/step";
import type { Frame, SimGraph, SimState } from "@/lib/simulation/types";

export const SPEEDS = [1, 5, 20, 100] as const;
export type Speed = (typeof SPEEDS)[number];

export type RunStatus = "idle" | "running" | "paused" | "finished";

export const RUN_LENGTH_SECONDS = 600;
export const TICKS_PER_SECOND = Math.round(1 / DT);

const RUN_LENGTH_TICKS = RUN_LENGTH_SECONDS * TICKS_PER_SECOND;
const LOAD_FACTOR = 1;

export interface SimulationState {
  status: RunStatus;
  speed: Speed;
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
      const ordered = orderGraph(graph);
      const { status } = get();
      const inProgress = status === "running" || status === "paused";
      set({
        graph,
        signature,
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
    advance: (ticks) => {
      const { graph, order, status } = get();
      if (!graph || !order || status === "finished") return;

      let sim = get().sim;
      let frame = get().frame;
      let finished = false;
      const recorded: Frame[] = [];

      for (let i = 0; i < ticks; i++) {
        const result = step(graph, order, sim, LOAD_FACTOR);
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
