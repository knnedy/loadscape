import { TooltipProvider } from "@/components/ui/tooltip";

export default function ProjectLayout({
  children,
}: LayoutProps<"/projects/[id]">) {
  return <>{children}</>;
}
