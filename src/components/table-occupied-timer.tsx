"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { formatOccupiedDuration } from "@/lib/floor-display";

export function TableOccupiedTimer({ since }: { since: string }) {
  const [label, setLabel] = useState(() => formatOccupiedDuration(since));

  useEffect(() => {
    const tick = () => setLabel(formatOccupiedDuration(since));
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [since]);

  return (
    <span className="floor-plan-table-time">
      <Clock className="floor-plan-table-time-icon" aria-hidden />
      {label}
    </span>
  );
}
