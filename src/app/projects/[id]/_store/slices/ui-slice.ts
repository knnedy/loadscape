import type { StateCreator } from "zustand";
import type { TopologyState } from "../topology-store";

export type ActivePanel =
  | "palette"
  | "templates"
  | "search"
  | "shortcuts"
  | "history"
  | "save-template";

export interface UiSlice {
  activePanel: ActivePanel | null;
  openPanel: (panel: ActivePanel) => void;
  closePanel: () => void;
  togglePanel: (panel: ActivePanel) => void;
}

export const createUiSlice: StateCreator<
  TopologyState & UiSlice,
  [["temporal", unknown]],
  [],
  UiSlice
> = (set, get) => ({
  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
  togglePanel: (panel) =>
    set({ activePanel: get().activePanel === panel ? null : panel }),
});
