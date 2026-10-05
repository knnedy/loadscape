import type { ProjectPreview } from "@/lib/project-preview";

const PADDING_RATIO = 0.1;
const MIN_WIDTH = 520;
const MIN_HEIGHT = 325; // 16:10, matching the thumbnail

export function ProjectPreviewSvg({ preview }: { preview: ProjectPreview }) {
  const { bounds, nodes, edges } = preview;

  // A floor on the view size keeps a one-node diagram from blowing up to fill
  // the whole thumbnail.
  const pad = Math.max(bounds.width, bounds.height) * PADDING_RATIO;
  const viewWidth = Math.max(bounds.width + pad * 2, MIN_WIDTH);
  const viewHeight = Math.max(bounds.height + pad * 2, MIN_HEIGHT);
  const viewX = bounds.x + bounds.width / 2 - viewWidth / 2;
  const viewY = bounds.y + bounds.height / 2 - viewHeight / 2;

  return (
    <svg
      viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-full w-full"
      aria-hidden="true">
      {nodes
        .filter((n) => n.kind === "group")
        .map((n, i) => (
          <rect
            key={`group-${i}`}
            x={n.x}
            y={n.y}
            width={n.width}
            height={n.height}
            rx={12}
            strokeWidth={1}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            style={{
              fill: "color-mix(in oklch, var(--muted-foreground) 6%, transparent)",
              stroke:
                "color-mix(in oklch, var(--muted-foreground) 45%, transparent)",
            }}
          />
        ))}

      {edges.map((e, i) => (
        <line
          key={`edge-${i}`}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          strokeWidth={1.25}
          strokeDasharray={e.dashed ? "3 3" : undefined}
          vectorEffect="non-scaling-stroke"
          style={{
            stroke: e.category
              ? `var(--cat-${e.category})`
              : "var(--muted-foreground)",
            strokeOpacity: 0.65,
          }}
        />
      ))}

      {nodes
        .filter((n) => n.kind !== "group")
        .map((n, i) => {
          const color =
            n.kind === "component" && n.category
              ? `var(--cat-${n.category})`
              : "var(--muted-foreground)";
          return (
            <rect
              key={`node-${i}`}
              x={n.x}
              y={n.y}
              width={n.width}
              height={n.height}
              rx={Math.min(n.width, n.height) * 0.22}
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
              style={{
                fill: `color-mix(in oklch, ${color} ${n.kind === "note" ? 10 : 18}%, var(--card))`,
                stroke: color,
                strokeOpacity: n.kind === "note" ? 0.5 : 1,
              }}
            />
          );
        })}
    </svg>
  );
}
