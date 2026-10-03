import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function throttle<Args extends unknown[]>(
  fn: (...args: Args) => void,
  waitMs: number,
): (...args: Args) => void {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Args | null = null;

  function invoke(args: Args) {
    lastCall = Date.now();
    fn(...args);
  }

  return (...args: Args) => {
    const now = Date.now();
    const remaining = waitMs - (now - lastCall);
    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      invoke(args);
    } else {
      pendingArgs = args;
      if (!timeout) {
        timeout = setTimeout(() => {
          timeout = null;
          if (pendingArgs) invoke(pendingArgs);
          pendingArgs = null;
        }, remaining);
      }
    }
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export const MAX_PROJECT_NAME_LENGTH = 80;

export function normalizeProjectName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > MAX_PROJECT_NAME_LENGTH) return null;
  return name;
}

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const elapsed = Math.round((now.getTime() - date.getTime()) / 1000);
  if (elapsed < 45) return "just now";
  if (elapsed < 3_600) {
    return relativeTimeFormat.format(
      -Math.max(1, Math.floor(elapsed / 60)),
      "minute",
    );
  }
  if (elapsed < 86_400) {
    return relativeTimeFormat.format(-Math.floor(elapsed / 3_600), "hour");
  }
  if (elapsed < 7 * 86_400) {
    return relativeTimeFormat.format(-Math.floor(elapsed / 86_400), "day");
  }
  return date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}
