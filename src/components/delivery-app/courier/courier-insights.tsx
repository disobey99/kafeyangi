"use client";

import { useEffect, useState } from "react";

type Insights = {
  total: number;
  days: number;
  byHour: { hour: number; count: number }[];
  peakHours: number[];
  tip: string;
};

export function CourierInsightsScreen({
  cafeId,
  primaryColor,
}: {
  cafeId: string;
  primaryColor: string;
}) {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/courier/insights`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Xato");
        setData(json);
      })
      .catch(() => setError("Tavsiyalar yuklanmadi"));
  }, [cafeId]);

  const max = Math.max(1, ...(data?.byHour.map((h) => h.count) ?? [1]));

  return (
    <div className="space-y-5 px-4 py-5">
      <h2 className="text-lg font-extrabold" style={{ color: "var(--da-ink)" }}>
        Tavsiyalar
      </h2>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <div
        className="rounded-2xl p-4 text-white"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, #0f766e 100%)`,
        }}
      >
        <p className="text-sm font-semibold opacity-90">
          So&apos;nggi {data?.days ?? 14} kun
        </p>
        <p className="mt-1 text-3xl font-extrabold">{data?.total ?? "…"}</p>
        <p className="text-sm opacity-90">yetkazish buyurtmasi</p>
        <p className="mt-3 text-sm leading-relaxed opacity-95">
          {data?.tip ?? "Yuklanmoqda…"}
        </p>
      </div>

      <div
        className="rounded-2xl p-4 shadow-sm"
        style={{ background: "var(--da-card)", border: "1px solid var(--da-border)" }}
      >
        <h3
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: "var(--da-muted)" }}
        >
          Soatlik taqsimot
        </h3>
        <div className="mt-4 flex h-36 items-end gap-0.5">
          {(data?.byHour ?? Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }))).map(
            (h) => {
              const peak = data?.peakHours.includes(h.hour);
              const height = Math.max(4, Math.round((h.count / max) * 100));
              return (
                <div
                  key={h.hour}
                  className="flex flex-1 flex-col items-center justify-end"
                  title={`${h.hour}:00 — ${h.count}`}
                >
                  <div
                    className="w-full rounded-t-sm"
                    style={{
                      height: `${height}%`,
                      background: peak
                        ? primaryColor
                        : "color-mix(in srgb, var(--da-muted) 45%, var(--da-input))",
                      minHeight: h.count > 0 ? 6 : 2,
                    }}
                  />
                </div>
              );
            },
          )}
        </div>
        <div
          className="mt-2 flex justify-between text-[10px]"
          style={{ color: "var(--da-muted)" }}
        >
          <span>00</span>
          <span>06</span>
          <span>12</span>
          <span>18</span>
          <span>23</span>
        </div>
      </div>
    </div>
  );
}
