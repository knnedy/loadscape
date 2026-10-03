import { Waypoints } from "lucide-react";
import { NewProjectButton } from "./new-project-button";

export function EmptyProjects() {
  return (
    <div
      className="mt-10 flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border px-6 py-20 text-center"
      style={{
        backgroundImage:
          "radial-gradient(var(--canvas-dot) 1.5px, transparent 1.5px)",
        backgroundSize: "24px 24px",
      }}>
      <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Waypoints size={20} />
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-foreground">
          No projects yet
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Create a project to start designing and stress-testing a system.
        </p>
      </div>
      <NewProjectButton />
    </div>
  );
}
