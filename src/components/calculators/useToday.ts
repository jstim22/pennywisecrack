"use client";

import { useSyncExternalStore } from "react";

// Today's date (local midnight), or null while rendering on the server, so
// date-based text only appears once we know the visitor's real date.
function subscribeToNothing() {
  return () => {};
}
function todayTimestamp() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}
export default function useToday() {
  const timestamp = useSyncExternalStore(
    subscribeToNothing,
    todayTimestamp,
    () => null,
  );
  return timestamp === null ? null : new Date(timestamp);
}
