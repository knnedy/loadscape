import { NotFoundView } from "@/components/not-found-view";

export default function ProjectNotFound() {
  return (
    <NotFoundView
      nodeLabel="Project"
      title="Project not found"
      description="It may have been deleted, or it belongs to a different account."
      actionHref="/projects"
      actionLabel="Back to projects"
    />
  );
}
