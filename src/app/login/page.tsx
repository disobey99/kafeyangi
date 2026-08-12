"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, KeyRound, Lock, Mail, Shield } from "lucide-react";
import { LoginScreen } from "@/components/login-screen";
import { StaffInstallHint } from "@/components/staff-install-hint";
import { getClientDeviceLabel, getOrCreateDeviceId } from "@/lib/device-client";

function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

type AuthMode = "login" | "forgot" | "reset";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const staffOnly = searchParams.get("for") === "staff";

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{
    requestId: string;
    deviceLabel: string;
  } | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    setError("");
    setInfo("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPassword(false);
  }

  function goToApp(data: {
    user?: { globalRole?: string };
    redirectTo?: string;
  }) {
    let target = "/dashboard";
    if (data.user?.globalRole === "SUPER_ADMIN" || data.user?.globalRole === "PLATFORM_STAFF") {
      target = "/platform";
    } else if (nextPath) {
      target = nextPath;
    } else if (data.redirectTo) {
      target = data.redirectTo;
    }
    // replace: telefon «ortga» login sahifasiga qaytmasin
    window.location.replace(target);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { redirectTo?: string };
        if (cancelled || !data.redirectTo || data.redirectTo === "/login") return;
        const target = nextPath ?? data.redirectTo;
        window.location.replace(target);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nextPath]);

  function startPolling(requestId: string) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/login-approval/${requestId}`);
        const data = await res.json();
        if (!res.ok) return;

        if (data.status === "REJECTED" || data.status === "EXPIRED") {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setPendingApproval(null);
          setError(
            data.status === "REJECTED"
              ? "Kirish rad etildi"
              : "Tasdiqlash muddati o'tdi. Qayta urinib ko'ring.",
          );
          setLoading(false);
          return;
        }

        if (data.status === "APPROVED" && data.approvalToken) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          const done = await fetch(`/api/auth/login-approval/${requestId}/complete`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approvalToken: data.approvalToken }),
          });
          const sessionData = await done.json();
          if (!done.ok) {
            setPendingApproval(null);
            setError(sessionData.error || "Sessiya ochilmadi");
            setLoading(false);
            return;
          }
          goToApp(sessionData);
          return;
        }

        if (data.status === "APPROVED" && !data.approvalToken) {
          if (pollRef.current) window.clearInterval(pollRef.current);
          setPendingApproval(null);
          setError("Tasdiq allaqachon ishlatilgan. Qayta kiring.");
          setLoading(false);
        }
      } catch {
        /* poll davom etadi */
      }
    }, 2000);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          deviceId: getOrCreateDeviceId(),
          deviceLabel: getClientDeviceLabel(),
        }),
        signal: AbortSignal.timeout(20_000),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          (data as { error?: string }).error || "Xatolik yuz berdi",
        );
        return;
      }

      if (
        (data as { needsApproval?: boolean; requestId?: string }).needsApproval &&
        (data as { requestId?: string }).requestId
      ) {
        setPendingApproval({
          requestId: (data as { requestId: string }).requestId,
          deviceLabel:
            (data as { deviceLabel?: string }).deviceLabel ||
            getClientDeviceLabel(),
        });
        startPolling((data as { requestId: string }).requestId);
        return;
      }

      goToApp(data as { user?: { globalRole?: string }; redirectTo?: string });
      // Sahifa almashtiriladi — loading o'chiq qoladi
      return;
    } catch (err) {
      const timedOut =
        err instanceof DOMException &&
        (err.name === "TimeoutError" || err.name === "AbortError");
      setError(timedOut ? "Server javob bermadi. Qayta urinib ko'ring." : "Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik yuz berdi");
        // Kunlik email limiti — baribir reset ekraniga o'tib Telegram taklif qilamiz
        if (data.useTelegramForResend && email.trim()) {
          setMode("reset");
        }
        return;
      }
      setInfo(data.message || "Kod yuborildi");
      setMode("reset");
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function handleTelegramResend() {
    setError("");
    setInfo("");
    if (!email.trim()) {
      setError("Avval emailni kiriting");
      return;
    }
    setTgLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Telegram havola olinmadi");
        return;
      }
      setInfo(data.message || "Telegram botga o'ting");
      if (data.telegramUrl) {
        window.open(data.telegramUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setTgLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (newPassword !== confirmPassword) {
      setError("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik yuz berdi");
        return;
      }
      setPassword("");
      setCode("");
      setNewPassword("");
      setConfirmPassword("");
      setInfo(data.message || "Parol yangilandi");
      setMode("login");
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  if (pendingApproval) {
    return (
      <LoginScreen staffOnly={staffOnly}>
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-center">
          <Shield className="mx-auto h-10 w-10 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Tasdiqlash kutilmoqda</h2>
          <p className="text-sm text-white/70">
            Bu qurilma yangi: <strong className="text-white">{pendingApproval.deviceLabel}</strong>
          </p>
          <p className="text-xs text-white/50">
            Boshqa telefoningizdagi bildirishnoma (qo&apos;ng&apos;iroqcha) orqali
            <strong className="text-white/80"> Tasdiqlash</strong> ni bosing.
          </p>
          <button
            type="button"
            className="login-submit"
            onClick={() => {
              if (pollRef.current) window.clearInterval(pollRef.current);
              setPendingApproval(null);
              setLoading(false);
            }}
          >
            Bekor qilish
          </button>
        </div>
      </LoginScreen>
    );
  }

  return (
    <LoginScreen staffOnly={staffOnly}>
      <StaffInstallHint />

      {mode === "login" && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="login-email" className="sr-only">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="Email manzil"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="login-password" className="sr-only">
              Parol
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input pr-12"
                placeholder="Parol"
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white/70"
                aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-xs font-medium text-white/50 transition hover:text-teal-300"
            >
              Parolni unutdingizmi?
            </button>
          </div>

          {error && (
            <p className="rounded-2xl bg-red-500/15 px-4 py-3 text-center text-sm font-medium text-red-300">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-center text-sm font-medium text-emerald-300">
              {info}
            </p>
          )}

          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Kirish..." : "Kirish"}
          </button>
        </form>
      )}

      {mode === "forgot" && (
        <form onSubmit={handleForgot} className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">Parolni tiklash</h2>
            <p className="mt-1 text-sm text-white/55">
              Emailingizga 6 xonali kod yuboramiz
            </p>
          </div>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
              placeholder="Email manzil"
              autoComplete="email"
              required
              disabled={loading}
            />
          </div>
          {error && (
            <p className="rounded-2xl bg-red-500/15 px-4 py-3 text-center text-sm font-medium text-red-300">
              {error}
            </p>
          )}
          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Yuborilmoqda..." : "Kodni yuborish"}
          </button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className="w-full text-center text-xs font-medium text-white/50 hover:text-white/70"
          >
            Orqaga — kirish
          </button>
        </form>
      )}

      {mode === "reset" && (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white">Yangi parol</h2>
            <p className="mt-1 text-sm text-white/55">
              {email} ga yuborilgan kodni kiriting
            </p>
          </div>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="login-input tracking-[0.3em]"
              placeholder="6 xonali kod"
              required
              disabled={loading}
            />
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="login-input pr-12"
              placeholder="Yangi parol"
              autoComplete="new-password"
              minLength={6}
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-white/40 transition hover:bg-white/5 hover:text-white/70"
              aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/35" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="login-input"
              placeholder="Parolni tasdiqlang"
              autoComplete="new-password"
              minLength={6}
              required
              disabled={loading}
            />
          </div>
          {error && (
            <p className="rounded-2xl bg-red-500/15 px-4 py-3 text-center text-sm font-medium text-red-300">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-2xl bg-emerald-500/15 px-4 py-3 text-center text-sm font-medium text-emerald-300">
              {info}
            </p>
          )}
          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Saqlanmoqda..." : "Parolni yangilash"}
          </button>
          <button
            type="button"
            onClick={() => void handleTelegramResend()}
            disabled={loading || tgLoading}
            className="w-full rounded-2xl border border-sky-400/30 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-200 transition hover:bg-sky-500/25 disabled:opacity-50"
          >
            {tgLoading
              ? "Telegram ochilmoqda..."
              : "Kodni qayta olish — Telegram bot"}
          </button>
          <p className="text-center text-[11px] text-white/40">
            Email kuniga 1 marta. Qayta kod — faqat Telegram orqali (maxsus havola).
          </p>
          <div className="flex justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="font-medium text-white/50 hover:text-teal-300"
              disabled={loading}
            >
              Emailni o&apos;zgartirish
            </button>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="font-medium text-white/50 hover:text-white/70"
            >
              Kirishga qaytish
            </button>
          </div>
        </form>
      )}

      {mode === "login" && (
        <details className="login-demo mt-6 group">
          <summary className="cursor-pointer list-none text-center text-xs text-white/40 transition hover:text-white/60 [&::-webkit-details-marker]:hidden">
            Demo hisoblar
          </summary>
          <div className="mt-3 space-y-1.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/55">
            <p>
              <span className="text-white/75">Admin:</span> admin@kafe.uz / admin123
            </p>
            <p>
              <span className="text-white/75">Egasi:</span> egasi@demo.uz / admin123
            </p>
            <p>
              <span className="text-white/75">Ofitsiant:</span> ofitsiant@demo.uz / admin123
            </p>
          </div>
        </details>
      )}
    </LoginScreen>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0a0b10] text-sm text-white/50">
          Yuklanmoqda...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
