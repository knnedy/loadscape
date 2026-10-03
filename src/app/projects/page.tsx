import type { Metadata } from "next";
import { requireSession } from "@/server/session";
import { listProjects } from "@/server/projects";
import { ProjectsHeader } from "./_components/projects-header";
import { ProjectCard } from "./_components/project-card";
import { NewProjectButton } from "./_components/new-project-button";
import { EmptyProjects } from "./_components/empty-projects";

export const metadata: Metadata = { title: "Projects | Loadscape" };

export default async function ProjectsPage() {
  const { user } = await requireSession();
  const projects = await listProjects(user.id);

  return (
    <div className="flex flex-1 flex-col">
      <ProjectsHeader user={{ name: user.name, email: user.email }} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Projects
            </h1>
            {projects.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {projects.length}{" "}
                {projects.length === 1 ? "project" : "projects"}
              </p>
            )}
          </div>
          {projects.length > 0 && <NewProjectButton />}
        </div>

        {projects.length === 0 ? (
          <EmptyProjects />
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard
                  id={project.id}
                  name={project.name}
                  updatedAt={project.updatedAt}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
