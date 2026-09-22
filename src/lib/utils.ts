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
