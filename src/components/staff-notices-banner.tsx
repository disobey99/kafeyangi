"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, X } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";

type Notice = {
  id: string;
  title: string;
  body: string;
  priority: string;
  createdAt: string;
};

const dismissKey = (cafeId: string) => `staff-notices-dismissed:${cafeId}`;

function readDismissed(cafeId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(dismissKey(cafeId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function writeDismissed(cafeId: string, ids: Set<string>) {
  localStorage.setItem(dismissKey(cafeId), JSON.stringify([...ids]));
}

export function StaffNoticesBanner({ cafeId }: { cafeId: string }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/notices?audience=STAFF`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const list = (data.notices ?? []) as Notice[];
    const priorityRank = (p: string) =>
      p === "HIGH" ? 0 : p === "NORMAL" ? 1 : 2;
    list.sort((a, b) => {
      const pr = priorityRank(a.priority) - priorityRank(b.priority);
      if (pr !== 0) return pr;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setNotices(list.slice(0, 8));
  }, [cafeId]);

  useEffect(() => {
    setDismissed(readDismissed(cafeId));
    void load();
  }, [cafeId, load]);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "ops.notice.created" || event.type === "ops.notice.updated") {
      void load();
    }
  });

  const visible = useMemo(
    () => notices.filter((n) => !dismissed.has(n.id)),
    [notices, dismissed],
  );

  function dismissOne(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeDismissed(cafeId, next);
      return next;
    });
  }

  function dismissAll() {
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const n of visible) next.add(n.id);
      writeDismissed(cafeId, next);
      return next;
    });
  }

  if (visible.length === 0) return null;

  return (
    <div className="sticky top-0 z-40 border-b border-amber-300/50 bg-amber-50 px-3 py-2 text-amber-950 shadow-sm dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-50">
      <div className="mx-auto flex max-w-6xl items-start gap-2">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              E&apos;lonlar ({visible.length})
            </p>
            {visible.length > 1 && (
              <button
                type="button"
                onClick={dismissAll}
                className="text-[11px] font-semibold text-amber-700 underline-offset-2 hover:underline dark:text-amber-200"
              >
                Hammasini yopish
              </button>
            )}
          </div>
          {visible.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2 rounded-lg border border-amber-200/80 bg-white/70 px-2.5 py-2 dark:border-amber-500/20 dark:bg-black/20"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {n.priority === "HIGH" && (
                    <span className="mr-1.5 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-white">
                      Muhim
                    </span>
                  )}
                  {n.title}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed opacity-90">
                  {n.body}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissOne(n.id)}
                className="rounded-md p-1 opacity-70 hover:bg-amber-100 hover:opacity-100 dark:hover:bg-amber-500/20"
                aria-label="Yopish"
                title="Yopish"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
