"use client";

import { ViewportPortal, useStore } from "@xyflow/react";
import type { Guides } from "../../_lib/alignment";

// A little overhang past the aligned nodes, in screen pixels.
const OVERHANG_PX = 10;

export function AlignmentGuides({ guides }: { guides: Guides }) {
  const zoom = useStore((s) => s.transform[2]);
  const { vertical, horizontal } = guides;
  if (!vertical && !horizontal) return null;

  // Sizes are in canvas units, so divide by zoom to keep lines 1px on screen.
  const thickness = 1 / zoom;
  const overhang = OVERHANG_PX / zoom;

  return (
    <ViewportPortal>
      {vertical && (
        <div
          className="pointer-events-none absolute bg-primary"
          style={{
            left: vertical.position - thickness / 2,
            top: vertical.from - overhang,
            width: thickness,
            height: vertical.to - vertical.from + overhang * 2,
          }}
        />
      )}
      {horizontal && (
        <div
          className="pointer-events-none absolute bg-primary"
          style={{
            left: horizontal.from - overhang,
            top: horizontal.position - thickness / 2,
            width: horizontal.to - horizontal.from + overhang * 2,
            height: thickness,
          }}
        />
      )}
    </ViewportPortal>
  );
}
