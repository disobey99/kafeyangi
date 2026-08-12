"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { NooklineMark } from "@/components/nookline-mark";

type Props = {
  title: string;
  subtitle?: string;
  storageKey: string;
  /** ms — animatsiya + kutish (default 2s) */
  durationMs?: number;
  /** Kafe logosi (yo‘q bo‘lsa Nookline mark) */
  logoUrl?: string | null;
  /** Accent / glow rangi */
  accentColor?: string;
};

/**
 * Ilova ochilganda logo + nom aralashgan qisqa kirish animatsiyasi.
 * Har brauzer sessiyasida (storageKey bo‘yicha) bir marta.
 */
export function BrandIntroSplash({
  title,
  subtitle,
  storageKey,
  durationMs = 2000,
  logoUrl,
  accentColor = "#7c3aed",
}: Props) {
  const [phase, setPhase] = useState<"show" | "out" | "done">("done");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(storageKey) === "1") return;
    } catch {
      /* ignore */
    }

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
      return;
    }

    setPhase("show");
    const outAt = Math.max(500, durationMs - 350);
    const t1 = window.setTimeout(() => setPhase("out"), outAt);
    const t2 = window.setTimeout(() => {
      setPhase("done");
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
    }, durationMs);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [durationMs, storageKey]);

  if (!mounted || phase === "done") return null;

  const letters = Array.from(title);

  return createPortal(
    <div
      className={`brand-intro ${phase === "out" ? "is-out" : ""}`}
      style={
        {
          "--brand-intro-accent": accentColor,
        } as React.CSSProperties
      }
      role="presentation"
      aria-hidden
    >
      <div className="brand-intro-glow" />
      <div className="brand-intro-stack">
        <div className="brand-intro-mark">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              width={72}
              height={72}
              className="brand-intro-cafe-logo"
              draggable={false}
            />
          ) : (
            <NooklineMark size={72} alt="" />
          )}
        </div>
        <p className="brand-intro-title" aria-label={title}>
          {letters.map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="brand-intro-letter"
              style={{ animationDelay: `${200 + i * 42}ms` }}
            >
              {ch === " " ? "\u00a0" : ch}
            </span>
          ))}
        </p>
        {subtitle ? <p className="brand-intro-sub">{subtitle}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
