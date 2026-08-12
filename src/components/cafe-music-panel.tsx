"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart } from "lucide-react";
import {
  readMusicFavorites,
  toggleMusicFavorite,
} from "@/lib/cafe-music-favorites";
import {
  CAFE_DAY_PART_META,
  buildMusicList,
  getCafeDayPart,
  trackKey,
  type CafeDayPart,
  type CafeMusicTrack,
} from "@/lib/cafe-music-suggestions";

export function CafeMusicPanel({
  cafeId,
  canManage,
  onSaveSchedule,
  savedSchedules = [],
}: {
  cafeId: string;
  canManage: boolean;
  onSaveSchedule?: (payload: {
    title: string;
    source: string;
    startsAt: string;
    endsAt: string;
    volume: number;
    daysMask: string;
  }) => void;
  savedSchedules?: Array<{ title?: unknown; startsAt?: unknown; endsAt?: unknown }>;
}) {
  const [partFilter, setPartFilter] = useState<CafeDayPart | "now">("now");
  const [favorites, setFavorites] = useState<CafeMusicTrack[]>([]);
  const [tick, setTick] = useState(0);
  const [ready, setReady] = useState(false);

  const now = useMemo(() => new Date(), [tick]);
  const currentPart = getCafeDayPart(now.getHours());
  const activePart = partFilter === "now" ? currentPart : partFilter;
  const meta =
    CAFE_DAY_PART_META.find((p) => p.id === activePart) ?? CAFE_DAY_PART_META[0];

  const list = useMemo(
    () => buildMusicList(activePart, favorites, now),
    [activePart, favorites, now],
  );

  const favSet = useMemo(
    () => new Set(favorites.map(trackKey)),
    [favorites],
  );

  useEffect(() => {
    setFavorites(readMusicFavorites(cafeId));
    setReady(true);
  }, [cafeId]);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(timer);
  }, []);

  function onToggleFavorite(track: CafeMusicTrack) {
    if (!canManage) return;
    setFavorites(toggleMusicFavorite(cafeId, track));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
            partFilter === "now" ? "ops-hub-tab-active" : "ops-hub-tab"
          }`}
          onClick={() => setPartFilter("now")}
        >
          Hozir
        </button>
        {CAFE_DAY_PART_META.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
              partFilter === p.id ? "ops-hub-tab-active" : "ops-hub-tab"
            }`}
            onClick={() => setPartFilter(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-lg border border-[var(--dp-border)] bg-[var(--dp-bg)]/40 px-3 py-2.5">
        <p className="text-sm font-bold text-[var(--dp-text)]">
          {meta.label}{" "}
          <span className="font-medium text-[var(--dp-muted)]">({meta.hours})</span>
        </p>
        <p className="mt-0.5 text-xs text-[var(--dp-accent)]">{meta.mood}</p>
        <p className="mt-1 text-xs text-[var(--dp-muted)]">
          Har kuni yangi 6 ta tavsiya. Yurakcha bosilganlar doim yuqorida qoladi.
        </p>
        <p className="mt-1 text-xs text-[var(--dp-muted)]">{meta.tip}</p>
      </div>

      {!ready ? (
        <p className="mt-3 text-sm text-[var(--dp-muted)]">Yuklanmoqda…</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {list.tracks.map((t, i) => {
            const key = trackKey(t);
            const isFav = favSet.has(key);
            const isDaily = i >= list.favorites.length;
            return (
              <li
                key={key}
                className="flex items-start gap-2 rounded-lg border border-[var(--dp-border)] px-2.5 py-2 text-sm"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--dp-accent-soft)] text-xs font-bold text-[var(--dp-accent)]">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--dp-text)]">{t.title}</p>
                  <p className="text-xs text-[var(--dp-muted)]">
                    {t.artist} · {t.vibe}
                    {isFav && (
                      <span className="ml-1 font-semibold text-rose-500">· saralangan</span>
                    )}
                    {isDaily && !isFav && (
                      <span className="ml-1 text-[var(--dp-muted)]">· bugungi tavsiya</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => onToggleFavorite(t)}
                  className="mt-0.5 rounded-lg p-1.5 transition hover:bg-[var(--dp-accent-soft)] disabled:opacity-40"
                  title={
                    canManage
                      ? isFav
                        ? "Saralashdan olib tashlash"
                        : "Saralash (doim ro'yxatda qoladi)"
                      : "Faqat manager/owner"
                  }
                  aria-label={isFav ? "Saralashdan olib tashlash" : "Saralash"}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isFav ? "fill-rose-500 text-rose-500" : "text-[var(--dp-muted)]"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {canManage && onSaveSchedule && (
        <button
          type="button"
          className="btn btn-secondary mt-3"
          onClick={() => {
            const range = meta.hours.match(/(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/);
            onSaveSchedule({
              title: `${meta.label}: ${list.tracks[0]?.title ?? "Mix"}`,
              source: list.tracks
                .slice(0, 4)
                .map((t) => `${t.title} — ${t.artist}`)
                .join("; "),
              startsAt: range?.[1] ?? "08:00",
              endsAt: range?.[2] ?? "12:00",
              volume: 45,
              daysMask: "1234567",
            });
          }}
        >
          Shu ro&apos;yxatni jadvalga saqlash
        </button>
      )}

      {savedSchedules.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-[var(--dp-muted)]">
          {savedSchedules.slice(0, 4).map((m, i) => (
            <li key={i}>
              • {String(m.title ?? "")} ({String(m.startsAt ?? "")}–{String(m.endsAt ?? "")})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
