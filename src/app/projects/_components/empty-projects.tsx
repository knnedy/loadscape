import { CanvasIllustration } from "@/components/canvas-illustration";
import { NewProjectButton } from "./new-project-button";

const gridBackground = {
  backgroundImage: [
    "linear-gradient(to right, color-mix(in oklch, var(--canvas-dot) 35%, transparent) 1px, transparent 1px)",
    "linear-gradient(to bottom, color-mix(in oklch, var(--canvas-dot) 35%, transparent) 1px, transparent 1px)",
    "radial-gradient(var(--canvas-dot) 1.5px, transparent 1.5px)",
  ].join(", "),
  backgroundSize: "120px 120px, 120px 120px, 24px 24px",
  maskImage: "linear-gradient(to right, transparent 5%, black 55%)",
  WebkitMaskImage: "linear-gradient(to right, transparent 5%, black 55%)",
};

export function EmptyProjects() {
  return (
    <section className="relative mt-8 overflow-hidden rounded-2xl border border-border bg-card">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 hidden w-3/5 md:block"
        style={gridBackground}
      />
      <div className="relative grid items-center gap-10 px-8 py-12 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:px-12">
        <div className="flex flex-col items-start gap-5">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-foreground">
              Design your first system
            </h2>
            <p className="max-w-sm text-sm text-pretty text-muted-foreground">
              Place components on the canvas, wire them together, then push
              traffic through the diagram to see where it breaks.
            </p>
          </div>
          <NewProjectButton />
        </div>

        <div className="hidden justify-center md:flex">
          <CanvasIllustration className="max-w-md" />
        </div>
      </div>
    </section>
  );
}
