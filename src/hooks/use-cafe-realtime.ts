"use client";

import { useEffect, useRef } from "react";
import { subscribeCafeEvents } from "@/lib/cafe-realtime-client";
import type { CafeEvent } from "@/lib/realtime";

export function useCafeRealtime(
  cafeId: string,
  onEvent: (event: CafeEvent) => void,
  options?: { enabled?: boolean },
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;
  const enabled = options?.enabled ?? true;

  useEffect(() => {
    if (!enabled || !cafeId) return;

    return subscribeCafeEvents(cafeId, (event) => {
      onEventRef.current(event);
    });
  }, [cafeId, enabled]);
}
