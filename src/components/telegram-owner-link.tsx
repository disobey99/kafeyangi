"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleHelp, Link2, Unlink } from "lucide-react";

const BOT_HELP = [
  "Tarif va sinov muddati haqida qisqa ma’lumot",
  "Muddat tugashiga ~3 kun qolganda ogohlantirish",
  "Skrinshot / rasm yuborish (matnli chat botda yo‘q)",
  "Matnli support — faqat Platforma Support (sayt)",
  "Parol tiklash havolasini Telegram orqali qayta olish",
];

export function TelegramOwnerLink({ embedded = false }: { embedded?: boolean }) {
  const [linked, setLinked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/telegram-link");
      const data = (await res.json().catch(() => ({}))) as { linked?: boolean };
      if (res.ok) setLinked(!!data.linked);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!helpOpen) return;
    function onDoc(e: MouseEvent) {
      if (!helpRef.current?.contains(e.target as Node)) setHelpOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setHelpOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [helpOpen]);

  async function linkProfile() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/telegram-link", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        telegramUrl?: string;
      };
      if (!res.ok) {
        setError(data.error || `Havola olinmadi (${res.status})`);
        return;
      }
      setMessage("Telegram ochildi — Start bosing va profil ulanadi.");
      if (data.telegramUrl) {
        window.open(data.telegramUrl, "_blank", "noopener,noreferrer");
      }
      setTimeout(() => void load(), 4000);
    } catch {
      setError("Tarmoq xatosi — qayta urinib ko‘ring");
    } finally {
      setLoading(false);
    }
  }

  async function unlink() {
    if (!window.confirm("Telegram profilni uzasizmi?")) return;
    setLoading(true);
    try {
      await fetch("/api/auth/telegram-link", { method: "DELETE" });
      setLinked(false);
      setMessage("Telegram uzildi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={embedded ? "" : "dp-card rounded-2xl p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="font-semibold text-[var(--dp-text)]">
            Nookline Support bot
          </h3>
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              aria-label="Bot nima qiladi"
              aria-expanded={helpOpen}
              onClick={() => setHelpOpen((v) => !v)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--dp-muted)] transition hover:bg-[var(--dp-nav-hover)] hover:text-[var(--dp-text)]"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
            {helpOpen && (
              <div
                role="dialog"
                className="absolute left-0 top-full z-30 mt-2 w-[min(18.5rem,calc(100vw-2.5rem))] rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] p-3 shadow-lg"
              >
                <p className="text-xs font-semibold text-[var(--dp-text)]">
                  Ulanganda bot:
                </p>
                <ul className="mt-2 space-y-1.5 text-xs leading-snug text-[var(--dp-muted)]">
                  {BOT_HELP.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--dp-accent,#0d9488)]" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {linked ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            <Check className="h-3.5 w-3.5" /> Ulangan
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-[var(--dp-nav-hover)] px-2.5 py-1 text-xs text-[var(--dp-muted)]">
            Ulanmagan
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => void linkProfile()}
          className="btn btn-primary gap-1.5 text-sm"
        >
          <Link2 className="h-4 w-4" />
          {linked ? "Qayta ulash" : "Profilni ulash"}
        </button>
        {linked && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void unlink()}
            className="btn btn-secondary gap-1.5 text-sm"
          >
            <Unlink className="h-4 w-4" />
            Uzish
          </button>
        )}
      </div>

      {message && (
        <p className="mt-3 text-sm text-emerald-600">{message}</p>
      )}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
    </div>
  );
}
