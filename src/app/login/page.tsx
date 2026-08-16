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
  const [support, setSupport] = useState<{
    email?: string | null;
    phone?: string | null;
    telegram?: string | null;
  } | null>(null);
  const [locked, setLocked] = useState(false);
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
    setLocked(false);
  }

  function SupportBox() {
    if (!support && !locked) return null;
    return (
      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-center text-xs text-amber-100/90">
        <p className="font-semibold text-amber-200">Supportga murojaat</p>
        {support?.email && (
          <p className="mt-1">
            <a href={`mailto:${support.email}`} className="underline">
              {support.email}
            </a>
          </p>
        )}
        {support?.phone && <p className="mt-0.5 tabular-nums">{support.phone}</p>}
        {support?.telegram && (
          <p className="mt-0.5">
            <a
              href={`https://t.me/${support.telegram}`}
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              @{support.telegram}
            </a>
          </p>
        )}
        {!support?.email && !support?.phone && !support?.telegram && (
          <p className="mt-1 text-amber-100/70">Saytdagi support chat orqali yozing.</p>
        )}
      </div>
    );
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
    setLocked(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        locked?: boolean;
        support?: {
          email?: string | null;
          phone?: string | null;
          telegram?: string | null;
        };
      };
      if (data.support) setSupport(data.support);
      if (!res.ok) {
        setError(data.error || "Xatolik yuz berdi");
        setLocked(!!data.locked);
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

  async function handleResendEmail() {
    setError("");
    setInfo("");
    setLocked(false);
    if (!email.trim()) {
      setError("Avval emailni kiriting");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        locked?: boolean;
        support?: {
          email?: string | null;
          phone?: string | null;
          telegram?: string | null;
        };
      };
      if (data.support) setSupport(data.support);
      if (!res.ok) {
        setError(data.error || "Kod yuborilmadi");
        setLocked(!!data.locked);
        return;
      }
      setInfo(data.message || "Yangi kod yuborildi");
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLocked(false);
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
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        locked?: boolean;
        support?: {
          email?: string | null;
          phone?: string | null;
          telegram?: string | null;
        };
      };
      if (data.support) setSupport(data.support);
      if (!res.ok) {
        setError(data.error || "Xatolik yuz berdi");
        setLocked(!!data.locked);
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
          {locked && <SupportBox />}
          <button type="submit" disabled={loading || locked} className="login-submit">
            {loading ? "Yuborilmoqda..." : "Kodni yuborish"}
          </button>
          <p className="text-center text-[11px] text-white/40">
            Kuniga 3 marta. Orada kutish — email spamdan himoya.
          </p>
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
              {email} ga yuborilgan 6 xonali kodni kiriting (3 urinish)
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
          {locked && <SupportBox />}
          <button type="submit" disabled={loading || locked} className="login-submit">
            {loading ? "Saqlanmoqda..." : "Parolni yangilash"}
          </button>
          <button
            type="button"
            onClick={() => void handleResendEmail()}
            disabled={loading || locked}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 disabled:opacity-50"
          >
            Kodni qayta yuborish (email)
          </button>
          <p className="text-center text-[11px] text-white/40">
            Faqat Gmail/email. 3 marta noto‘g‘ri kod yoki kunlik limit — support.
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
