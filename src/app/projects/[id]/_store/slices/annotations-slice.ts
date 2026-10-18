import type { StateCreator } from "zustand";
import type { TopologyGroupData, TopologyNoteData } from "@/lib/types/topology";
import { groupColorPalette } from "@/lib/catalog/group-colors";
import type { IdCounters } from "../id-counters";
import type { TopologyState } from "../topology-store";

export interface AnnotationsSlice {
  addGroup: () => void;
  renameGroup: (id: string, label: string) => void;
  updateGroupColor: (id: string, color: string) => void;
  addNote: () => void;
  updateNoteText: (id: string, text: string) => void;
  updateNoteColor: (id: string, color: string) => void;
}

export const createAnnotationsSlice =
  (
    counters: IdCounters,
  ): StateCreator<
    TopologyState,
    [["temporal", unknown]],
    [],
    AnnotationsSlice
  > =>
  (set, get) => ({
    addGroup: () => {
      const n = counters.next("group");
      const id = `group-${n}`;
      const color = groupColorPalette[(n - 1) % groupColorPalette.length];
      const newGroup = {
        id,
        type: "group-container",
        position: {
          x: 160 + n * 20,
          y: 60 + n * 20,
        },
        style: { width: 320, height: 220 },
        data: { label: "New Group", color } satisfies TopologyGroupData,
        zIndex: -1,
      };
      set({ nodes: [newGroup, ...get().nodes], selectedNodeId: id });
    },
    renameGroup: (id, label) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, label } } : n,
        ),
      }),
    updateGroupColor: (id, color) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, color } } : n,
        ),
      }),
    addNote: () => {
      const n = counters.next("note");
      const id = `note-${n}`;
      const color = groupColorPalette[(n - 1) % groupColorPalette.length];
      const newNote = {
        id,
        type: "note",
        position: {
          x: 200 + n * 20,
          y: 400 + n * 20,
        },
        style: { width: 200, height: 140 },
        data: { text: "", color } satisfies TopologyNoteData,
      };
      set({ nodes: [...get().nodes, newNote], selectedNodeId: id });
    },
    updateNoteText: (id, text) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, text } } : n,
        ),
      }),
    updateNoteColor: (id, color) =>
      set({
        nodes: get().nodes.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, color } } : n,
        ),
      }),
  });
