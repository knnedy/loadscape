"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-accent">
      {resolvedTheme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
