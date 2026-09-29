import { toPng } from "html-to-image";
import { getViewportForBounds, type Rect } from "@xyflow/react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const PADDING = 0.1;

export interface RenderCanvasOptions {
  width?: number;
  height?: number;
}

// Captures the whole diagram as a PNG data URL, framed to `bounds`
//  regardless of the user's current pan/zoom.
export async function renderCanvasToPng(
  bounds: Rect,
  { width = 1920, height = 1080 }: RenderCanvasOptions = {},
): Promise<string> {
  const viewportEl = document.querySelector<HTMLElement>(
    ".react-flow__viewport",
  );
  if (!viewportEl) throw new Error("Canvas viewport not found");

  const viewport = getViewportForBounds(
    bounds,
    width,
    height,
    MIN_ZOOM,
    MAX_ZOOM,
    PADDING,
  );

  return toPng(viewportEl, {
    backgroundColor: getComputedStyle(document.body).backgroundColor,
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  });
}
