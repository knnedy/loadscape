export interface Shortcut {
  label: string;
  keys: string[];
  // A second key combination that does the same thing.
  alternate?: string[];
}

export interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

// "mod" renders as ⌘ on Mac and Ctrl elsewhere.
export const shortcutGroups: ShortcutGroup[] = [
  {
    title: "Building",
    shortcuts: [
      { label: "Add a component", keys: ["mod", "K"] },
      { label: "Duplicate the selected node", keys: ["mod", "D"] },
      {
        label: "Delete the selection",
        keys: ["Delete"],
        alternate: ["Backspace"],
      },
    ],
  },
  {
    title: "History",
    shortcuts: [
      { label: "Undo", keys: ["mod", "Z"] },
      { label: "Redo", keys: ["mod", "Shift", "Z"] },
    ],
  },
  {
    title: "Selecting and moving",
    shortcuts: [
      { label: "Select with a box", keys: ["Shift", "Drag"] },
      { label: "Add to the selection", keys: ["mod", "Click"] },
      { label: "Pan the canvas", keys: ["Drag"] },
      { label: "Pan over nodes", keys: ["Space", "Drag"] },
      { label: "Quick actions on a node or edge", keys: ["Right-click"] },
      { label: "Find a node and jump to it", keys: ["/"] },
    ],
  },
  {
    title: "In the component palette",
    shortcuts: [
      { label: "Move between results", keys: ["↑", "↓"] },
      { label: "Add the highlighted one", keys: ["Enter"] },
      { label: "Close", keys: ["Esc"] },
    ],
  },
  {
    title: "Help",
    shortcuts: [{ label: "Show this list", keys: ["?"] }],
  },
];

export function formatKey(key: string, isMac: boolean) {
  if (key === "mod") return isMac ? "⌘" : "Ctrl";
  if (key === "Shift") return isMac ? "⇧" : "Shift";
  return key;
}
