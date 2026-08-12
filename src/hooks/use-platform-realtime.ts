"use client";

import { useEffect, useRef } from "react";
import { subscribePlatformEvents } from "@/lib/platform-realtime-client";
import type { PlatformEvent } from "@/lib/realtime";

export function usePlatformRealtime(
  onEvent: (event: PlatformEvent) => void,
  options?: { enabled?: boolean },
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    return subscribePlatformEvents((event) => {
      onEventRef.current(event);
    });
  }, [enabled]);
}
