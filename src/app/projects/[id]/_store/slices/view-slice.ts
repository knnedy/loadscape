import type { StateCreator } from "zustand";
import type { TopologyState } from "../topology-store";

export interface ViewSlice {
  showMiniMap: boolean;
  toggleMiniMap: () => void;
  snapToGrid: boolean;
  toggleSnapToGrid: () => void;
}

export const createViewSlice: StateCreator<
  TopologyState,
  [["temporal", unknown]],
  [],
  ViewSlice
> = (set, get) => ({
  showMiniMap: false,
  toggleMiniMap: () => set({ showMiniMap: !get().showMiniMap }),
  snapToGrid: false,
  toggleSnapToGrid: () => set({ snapToGrid: !get().snapToGrid }),
});
