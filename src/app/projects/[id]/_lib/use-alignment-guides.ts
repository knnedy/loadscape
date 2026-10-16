"use client";

import { useCallback, useState } from "react";
import { useReactFlow, type NodeChange } from "@xyflow/react";
import { useTopologyStore } from "../_store/topology-provider";
import type { AppNode } from "../_store/topology-store";
import { computeAlignment, type Box, type Guides } from "./alignment";

const SNAP_DISTANCE_PX = 6;
const NO_GUIDES: Guides = { vertical: null, horizontal: null };

type PositionChange = Extract<NodeChange<AppNode>, { type: "position" }>;

// Wraps the store's onNodesChange: while exactly one node is being dragged,
// nudges its position onto nearby alignments and reports the guide lines.
export function useAlignmentGuides() {
  const { getInternalNode, getNodes, getViewport } = useReactFlow<AppNode>();
  const onNodesChange = useTopologyStore((s) => s.onNodesChange);
  const [guides, setGuides] = useState<Guides>(NO_GUIDES);

  const clearGuides = useCallback(() => setGuides(NO_GUIDES), []);

  const handleNodesChange = useCallback(
    (changes: NodeChange<AppNode>[]) => {
      const dragging = changes.filter(
        (change): change is PositionChange =>
          change.type === "position" &&
          change.dragging === true &&
          change.position !== undefined,
      );

      if (dragging.length !== 1) {
        // Several nodes moving together would make the lines meaningless.
        if (dragging.length > 1) setGuides(NO_GUIDES);
        onNodesChange(changes);
        return;
      }

      const change = dragging[0];
      const position = change.position!;
      const movingNode = getInternalNode(change.id);
      if (!movingNode) {
        onNodesChange(changes);
        return;
      }

      // Child positions are relative to their group; guides need absolute.
      const parent = movingNode.parentId
        ? getInternalNode(movingNode.parentId)
        : undefined;
      const origin = parent?.internals.positionAbsolute ?? { x: 0, y: 0 };
      const moving: Box = {
        x: origin.x + position.x,
        y: origin.y + position.y,
        width: movingNode.measured.width ?? 0,
        height: movingNode.measured.height ?? 0,
      };

      const others: Box[] = [];
      for (const node of getNodes()) {
        if (node.id === change.id || node.parentId === change.id) continue;
        const internal = getInternalNode(node.id);
        const { width, height } = internal?.measured ?? {};
        if (!internal || !width || !height) continue;
        others.push({
          x: internal.internals.positionAbsolute.x,
          y: internal.internals.positionAbsolute.y,
          width,
          height,
        });
      }

      const threshold = SNAP_DISTANCE_PX / getViewport().zoom;
      const {
        dx,
        dy,
        guides: next,
      } = computeAlignment(moving, others, threshold);
      setGuides(next);

      onNodesChange(
        changes.map((candidate) =>
          candidate === change
            ? {
                ...change,
                position: { x: position.x + dx, y: position.y + dy },
              }
            : candidate,
        ),
      );
    },
    [getInternalNode, getNodes, getViewport, onNodesChange],
  );

  return { guides, handleNodesChange, clearGuides };
}
