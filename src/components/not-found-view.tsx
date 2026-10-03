import Link from "next/link";

interface NotFoundViewProps {
  nodeLabel: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}

export function NotFoundView({
  nodeLabel,
  title,
  description,
  actionHref,
  actionLabel,
}: NotFoundViewProps) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <svg
        viewBox="0 0 360 96"
        className="h-auto w-full max-w-90"
        aria-hidden="true">
        <path
          d="M 136 48 H 224"
          fill="none"
          strokeWidth={1.75}
          strokeDasharray="6 5"
          style={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.7 }}
        />
        <rect
          x={8}
          y={24}
          width={128}
          height={48}
          rx={10}
          strokeWidth={1.5}
          style={{
            fill: "color-mix(in oklch, var(--primary) 12%, var(--card))",
            stroke: "var(--primary)",
          }}
        />
        <text
          x={72}
          y={48}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={14}
          fontWeight={500}
          style={{ fill: "var(--foreground)" }}>
          {nodeLabel}
        </text>
        <rect
          x={224}
          y={24}
          width={128}
          height={48}
          rx={10}
          fill="none"
          strokeWidth={1.5}
          strokeDasharray="6 5"
          style={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.7 }}
        />
        <text
          x={288}
          y={48}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={18}
          style={{ fill: "var(--muted-foreground)" }}>
          ?
        </text>
        <circle
          cx={180}
          cy={48}
          r={9}
          strokeWidth={1.5}
          style={{ fill: "var(--background)", stroke: "var(--destructive)" }}
        />
        <path
          d="M 176 44 L 184 52 M 184 44 L 176 52"
          fill="none"
          strokeWidth={1.5}
          strokeLinecap="round"
          style={{ stroke: "var(--destructive)" }}
        />
      </svg>

      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>

      <Link
        href={actionHref}
        className="flex items-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition-transform duration-150 hover:opacity-90 active:scale-[0.97]"
        style={{
          boxShadow:
            "inset 0 1px 0 0 color-mix(in oklch, var(--primary-foreground) 20%, transparent)",
        }}>
        {actionLabel}
      </Link>
    </main>
  );
}
