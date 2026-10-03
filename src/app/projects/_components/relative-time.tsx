"use client";

import { useSyncExternalStore } from "react";
import { formatRelativeTime } from "@/lib/utils";

const subscribe = () => () => {};

export function RelativeTime({ date }: { date: Date }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return (
    <time dateTime={date.toISOString()}>
      {mounted ? formatRelativeTime(date) : ""}
    </time>
  );
}
