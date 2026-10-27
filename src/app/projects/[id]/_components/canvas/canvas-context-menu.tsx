"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { groupColorPalette } from "@/lib/catalog/group-colors";
import {
  capacityOverride,
  capacityTiers,
  defaultCapacity,
  formatRate,
  limitsCapacity,
} from "@/lib/simulation/capacity";
import type {
  EdgeDirection,
  EdgeStyle,
  TopologyNodeData,
} from "@/lib/types/topology";
import { cn } from "@/lib/utils";
import { formatKey } from "../../_lib/shortcuts";
import { useTopologyStore } from "../../_store/topology-provider";

export interface ContextMenuTarget {
  kind: "node" | "edge";
  id: string;
  x: number;
  y: number;
}

const EDGE_STYLES: { value: EdgeStyle; label: string }[] = [
  { value: "sync", label: "Sync" },
  { value: "async", label: "Async" },
];

const EDGE_DIRECTIONS: { value: EdgeDirection; label: string }[] = [
  { value: "forward", label: "Forward" },
  { value: "bidirectional", label: "Bidirectional" },
  { value: "none", label: "None" },
];

function MenuSurface({
  x,
  y,
  onClose,
  children,
}: {
  x: number;
  y: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // Measure once mounted so the menu never spills off-screen.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setPosition({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    });
    el.focus({ preventScroll: true });
  }, [x, y]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleEscape);
    window.addEventListener("wheel", onClose, { passive: true });
    window.addEventListener("resize", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleEscape);
      window.removeEventListener("wheel", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [],
    );
    if (items.length === 0) return;
    const index = items.indexOf(document.activeElement as HTMLElement);

    let next: number | null = null;
    if (event.key === "ArrowDown")
      next = index + 1 >= items.length ? 0 : index + 1;
    else if (event.key === "ArrowUp")
      next = index <= 0 ? items.length - 1 : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    if (next === null) return;

    event.preventDefault();
    items[next].focus();
  }

  return (
    <div
      ref={ref}
      role="menu"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onContextMenu={(event) => event.preventDefault()}
      className="fixed z-50 min-w-56 rounded-xl border border-border bg-card p-1 text-foreground shadow-lg outline-none"
      style={position}>
      {children}
    </div>
  );
}

function Heading({ children }: { children: ReactNode }) {
  return (
    <p
      role="presentation"
      className="px-2 pt-1.5 pb-1 text-xs font-medium text-muted-foreground">
      {children}
    </p>
  );
}

function Divider() {
  return <div role="separator" className="my-1 h-px bg-border" />;
}

function Item({
  label,
  icon,
  shortcut,
  checked,
  destructive,
  onSelect,
}: {
  label: string;
  icon?: ReactNode;
  shortcut?: string[];
  checked?: boolean;
  destructive?: boolean;
  onSelect: () => void;
}) {
  const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);

  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:bg-accent",
        destructive ? "text-destructive" : "text-foreground",
      )}>
      <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-3.5">
        {icon ?? (checked ? <Check /> : null)}
      </span>
      <span className="flex-1">{label}</span>
      {shortcut && (
        <span className="text-[11px] text-muted-foreground">
          {shortcut.map((key) => formatKey(key, isMac)).join(" ")}
        </span>
      )}
    </button>
  );
}

function ColorRow({
  current,
  onPick,
}: {
  current: string | undefined;
  onPick: (color: string) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Color"
      className="flex flex-wrap gap-1.5 px-2 py-1.5">
      {groupColorPalette.map((color, index) => (
        <button
          key={color}
          type="button"
          role="menuitemradio"
          aria-checked={current === color}
          aria-label={`Color ${index + 1}`}
          onClick={() => onPick(color)}
          className={cn(
            "size-5 rounded-full border border-border outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary/60",
            current === color &&
              "ring-2 ring-foreground/70 ring-offset-1 ring-offset-card",
          )}
          style={{ background: color }}
        />
      ))}
    </div>
  );
}

function NodeMenuItems({ id, onClose }: { id: string; onClose: () => void }) {
  const node = useTopologyStore((s) => s.nodes.find((n) => n.id === id));
  const selectedCount = useTopologyStore(
    (s) => s.nodes.filter((n) => n.selected).length,
  );
  const duplicateNode = useTopologyStore((s) => s.duplicateNode);
  const deleteNode = useTopologyStore((s) => s.deleteNode);
  const deleteSelection = useTopologyStore((s) => s.deleteSelection);
  const updateNodeConfig = useTopologyStore((s) => s.updateNodeConfig);
  const updateGroupColor = useTopologyStore((s) => s.updateGroupColor);
  const updateNoteColor = useTopologyStore((s) => s.updateNoteColor);

  if (!node) return null;

  function run(action: () => void) {
    return () => {
      action();
      onClose();
    };
  }

  if (node.selected && selectedCount > 1) {
    return (
      <Item
        destructive
        icon={<Trash2 />}
        label={`Delete ${selectedCount} selected`}
        shortcut={["Delete"]}
        onSelect={run(deleteSelection)}
      />
    );
  }

  if (node.type === "component") {
    const data = node.data as TopologyNodeData;
    const limits = limitsCapacity(data.componentId, data.category);
    const base = defaultCapacity(data.componentId, data.category);
    const current = data.capacity ?? base;
    return (
      <>
        <Item
          icon={<Copy />}
          label="Duplicate"
          shortcut={["mod", "D"]}
          onSelect={run(() => duplicateNode(id))}
        />
        {limits && (
          <>
            <Divider />
            <Heading>Capacity</Heading>
            {capacityTiers(base).map((tier) => (
              <Item
                key={tier.label}
                checked={current === tier.value}
                label={`${tier.label} (${formatRate(tier.value)} req/s)`}
                onSelect={run(() =>
                  updateNodeConfig(id, {
                    capacity: capacityOverride(tier.value, base),
                  }),
                )}
              />
            ))}
          </>
        )}
        <Divider />
        <Item
          destructive
          icon={<Trash2 />}
          label="Delete"
          shortcut={["Delete"]}
          onSelect={run(() => deleteNode(id))}
        />
      </>
    );
  }

  const isNote = node.type === "note";
  const color = (node.data as { color?: string }).color;

  return (
    <>
      <Heading>Color</Heading>
      <ColorRow
        current={color}
        onPick={(picked) => {
          if (isNote) updateNoteColor(id, picked);
          else updateGroupColor(id, picked);
          onClose();
        }}
      />
      {isNote && (
        <>
          <Divider />
          <Item
            icon={<Copy />}
            label="Duplicate"
            shortcut={["mod", "D"]}
            onSelect={run(() => duplicateNode(id))}
          />
        </>
      )}
      <Divider />
      <Item
        destructive
        icon={<Trash2 />}
        label={isNote ? "Delete note" : "Delete group"}
        shortcut={["Delete"]}
        onSelect={run(() => deleteNode(id))}
      />
    </>
  );
}

function EdgeMenuItems({ id, onClose }: { id: string; onClose: () => void }) {
  const edge = useTopologyStore((s) => s.edges.find((e) => e.id === id));
  const deleteEdge = useTopologyStore((s) => s.deleteEdge);
  const updateEdgeStyle = useTopologyStore((s) => s.updateEdgeStyle);
  const updateEdgeDirection = useTopologyStore((s) => s.updateEdgeDirection);

  if (!edge) return null;

  function run(action: () => void) {
    return () => {
      action();
      onClose();
    };
  }

  return (
    <>
      <Heading>Style</Heading>
      {EDGE_STYLES.map(({ value, label }) => (
        <Item
          key={value}
          checked={edge.data?.style === value}
          label={label}
          onSelect={run(() => updateEdgeStyle(id, value))}
        />
      ))}
      <Divider />
      <Heading>Direction</Heading>
      {EDGE_DIRECTIONS.map(({ value, label }) => (
        <Item
          key={value}
          checked={edge.data?.direction === value}
          label={label}
          onSelect={run(() => updateEdgeDirection(id, value))}
        />
      ))}
      <Divider />
      <Item
        destructive
        icon={<Trash2 />}
        label="Delete connection"
        shortcut={["Delete"]}
        onSelect={run(() => deleteEdge(id))}
      />
    </>
  );
}

export function CanvasContextMenu({
  target,
  onClose,
}: {
  target: ContextMenuTarget | null;
  onClose: () => void;
}) {
  if (!target) return null;

  return (
    <MenuSurface
      key={`${target.kind}-${target.id}-${target.x}-${target.y}`}
      x={target.x}
      y={target.y}
      onClose={onClose}>
      {target.kind === "node" ? (
        <NodeMenuItems id={target.id} onClose={onClose} />
      ) : (
        <EdgeMenuItems id={target.id} onClose={onClose} />
      )}
    </MenuSurface>
  );
}
