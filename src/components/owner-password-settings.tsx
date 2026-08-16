"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

export function OwnerPasswordSettings() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    if (newPassword !== confirm) {
      setError("Yangi parollar mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!res.ok) {
        setError(data.error || "Saqlanmadi");
        return;
      }
      setOk(data.message || "Parol yangilandi");
      setCurrent("");
      setNew("");
      setConfirm("");
      try {
        localStorage.removeItem("nookline.passwordSecurityDismissedAt");
      } catch {
        /* ignore */
      }
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-[var(--dp-accent)]" />
        <div>
          <h3 className="font-semibold text-[var(--dp-text)]">Hisob paroli</h3>
          <p className="text-sm text-[var(--dp-muted)]">
            Kirish parolini o‘zgartiring. Boshqa qurilmalardagi sessiyalar yopiladi.
          </p>
        </div>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--dp-muted)]">Joriy parol</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] px-3 py-2.5 text-[var(--dp-text)]"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--dp-muted)]">Yangi parol</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className="w-full rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] px-3 py-2.5 text-[var(--dp-text)]"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-[var(--dp-muted)]">Tasdiqlash</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] px-3 py-2.5 text-[var(--dp-text)]"
        />
      </label>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {ok && <p className="text-sm text-emerald-600">{ok}</p>}
      <button type="submit" disabled={loading} className="btn btn-primary text-sm">
        {loading ? "Saqlanmoqda…" : "Parolni saqlash"}
      </button>
    </form>
  );
}
