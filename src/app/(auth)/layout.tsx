import Link from "next/link";
import { CanvasIllustration } from "@/components/canvas-illustration";

const canvasBackground = {
  backgroundImage: [
    "linear-gradient(to right, color-mix(in oklch, var(--canvas-dot) 35%, transparent) 1px, transparent 1px)",
    "linear-gradient(to bottom, color-mix(in oklch, var(--canvas-dot) 35%, transparent) 1px, transparent 1px)",
    "radial-gradient(var(--canvas-dot) 1.5px, transparent 1.5px)",
  ].join(", "),
  backgroundSize: "120px 120px, 120px 120px, 24px 24px",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link
          href="/"
          className="w-fit text-base font-semibold tracking-tight text-foreground">
          Loadscape
        </Link>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>

      <aside
        aria-hidden="true"
        className="hidden items-center justify-center overflow-hidden border-l border-border bg-muted/30 p-10 lg:flex"
        style={canvasBackground}>
        <CanvasIllustration />
      </aside>
    </div>
  );
}
