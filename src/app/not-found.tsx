import { NotFoundView } from "@/components/not-found-view";

export default function NotFound() {
  return (
    <NotFoundView
      nodeLabel="Page"
      title="Page not found"
      description="The address may be mistyped, or the page may have moved."
      actionHref="/projects"
      actionLabel="Go to projects"
    />
  );
}
