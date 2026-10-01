import { categories } from "@/lib/catalog/components";

const WIDTH = 480;
const HEIGHT = 540;
const NODE_HEIGHT = 34;

type Slot = { x: number; y: number; note?: string };

const slots: Slot[] = [
  { x: 150, y: 56 },
  { x: 330, y: 150, note: "10,000 req/s" },
  { x: 140, y: 262 },
  { x: 340, y: 362, note: "1,000 req/s" },
  { x: 160, y: 456 },
  { x: 330, y: 500, note: "100 req/s" },
];

const links = [
  { from: 0, to: 1, dashed: false },
  { from: 1, to: 2, dashed: false },
  { from: 1, to: 3, dashed: true },
  { from: 2, to: 4, dashed: false },
  { from: 3, to: 5, dashed: false },
  { from: 4, to: 5, dashed: true },
];

function edgePath(a: Slot, b: Slot) {
  const midY = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
}

export function AuthDiagram() {
  const nodes = categories
    .slice(0, slots.length)
    .map(({ category, label }, i) => ({
      ...slots[i],
      category,
      label,
      color: `var(--cat-${category})`,
      width: Math.round(label.length * 7.4 + 46),
    }));
  const edges = links.filter(
    ({ from, to }) => from < nodes.length && to < nodes.length,
  );

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full max-w-120"
      aria-hidden="true">
      {edges.map(({ from, to, dashed }) => (
        <path
          key={`edge-${from}-${to}`}
          d={edgePath(nodes[from], nodes[to])}
          fill="none"
          strokeWidth={1.5}
          strokeDasharray={dashed ? "6 5" : undefined}
          style={{ stroke: nodes[from].color, strokeOpacity: 0.6 }}
        />
      ))}

      {edges.map(({ from, to }, i) => (
        <circle
          key={`packet-${from}-${to}`}
          r={3.5}
          className="motion-reduce:hidden"
          style={{ fill: nodes[from].color }}>
          <animateMotion
            path={edgePath(nodes[from], nodes[to])}
            dur={`${3.2 + (i % 3) * 0.6}s`}
            begin={`-${i * 0.7}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {nodes.map((node) => (
        <g
          key={node.category}
          transform={`translate(${node.x - node.width / 2} ${node.y - NODE_HEIGHT / 2})`}>
          <rect
            width={node.width}
            height={NODE_HEIGHT}
            rx={NODE_HEIGHT / 2}
            strokeWidth={1.5}
            style={{
              fill: `color-mix(in oklch, ${node.color} 14%, var(--background))`,
              stroke: node.color,
            }}
          />
          <circle
            cx={18}
            cy={NODE_HEIGHT / 2}
            r={4}
            style={{ fill: node.color }}
          />
          <text
            x={30}
            y={NODE_HEIGHT / 2}
            dominantBaseline="central"
            fontSize={13}
            style={{ fill: "var(--foreground)" }}>
            {node.label}
          </text>
          {node.note && (
            <text
              x={node.width / 2}
              y={NODE_HEIGHT + 16}
              textAnchor="middle"
              fontSize={11}
              className="font-mono"
              style={{ fill: "var(--muted-foreground)" }}>
              {node.note}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
