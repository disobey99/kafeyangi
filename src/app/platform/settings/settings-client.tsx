"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { PlatformTariffSettings } from "@/components/platform-tariff-settings";
import { PasswordField } from "@/components/password-field";
import type { PlanCurrency, PlanDiscountConfig } from "@/lib/platform-settings-types";
import type { PlanId } from "@/lib/plans";

type SettingsState = {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  socialInstagram: string;
  socialTelegram: string;
  socialFacebook: string;
  notifyNewCustomer: boolean;
  notifyPaymentOverdue: boolean;
  notifyWeeklyReport: boolean;
  supportPhone: string;
  supportTelegram: string;
  supportInstagram: string;
  supportTitle: string;
  planCurrency: PlanCurrency;
  planPrices: Record<PlanId, number>;
  planDiscounts: Record<PlanId, PlanDiscountConfig>;
};

const EMPTY: SettingsState = {
  companyName: "",
  contactEmail: "",
  contactPhone: "",
  socialInstagram: "",
  socialTelegram: "",
  socialFacebook: "",
  notifyNewCustomer: true,
  notifyPaymentOverdue: true,
  notifyWeeklyReport: false,
  supportPhone: "",
  supportTelegram: "",
  supportInstagram: "",
  supportTitle: "Qo'llab-quvvatlash",
  planCurrency: "USD",
  planPrices: { STARTER: 9, STANDARD: 19, PRO: 39 },
  planDiscounts: {
    STARTER: { enabled: false, percent: 0, validFrom: "", validTo: "" },
    STANDARD: { enabled: false, percent: 0, validFrom: "", validTo: "" },
    PRO: { enabled: false, percent: 0, validFrom: "", validTo: "" },
  },
};

export function PlatformSettingsPageClient() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [forgotCurrent, setForgotCurrent] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platform/settings");
        const data = (await res.json()) as {
          settings?: SettingsState;
          error?: string;
        };
        if (!res.ok || !data.settings) {
          if (!cancelled) setError(data.error ?? "Yuklashda xatolik");
          return;
        }
        if (!cancelled) setSettings(data.settings);
      } catch {
        if (!cancelled) setError("Tarmoq xatosi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function patchSettings(patch: Partial<SettingsState>) {
    setError(null);
    const res = await fetch("/api/platform/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as {
      settings?: SettingsState;
      error?: string;
    };
    if (!res.ok || !data.settings) {
      throw new Error(data.error ?? "Saqlashda xatolik");
    }
    setSettings(data.settings);
    return data.settings;
  }

  async function saveCompany(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await patchSettings({
        companyName: settings.companyName,
        contactEmail: settings.contactEmail,
        contactPhone: settings.contactPhone,
        socialInstagram: settings.socialInstagram,
        socialTelegram: settings.socialTelegram,
        socialFacebook: settings.socialFacebook,
        supportPhone: settings.supportPhone,
        supportTelegram: settings.supportTelegram,
        supportInstagram: settings.supportInstagram,
        supportTitle: settings.supportTitle,
      });
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saqlashda xatolik");
    } finally {
      setSaving(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwSaving) return;
    setPwError(null);
    setRevealedPassword(null);
    if (newPassword !== confirmPassword) {
      setPwError("Yangi parol tasdiqi mos kelmadi");
      return;
    }
    if (!forgotCurrent && !currentPassword.trim()) {
      setPwError("Joriy parolni kiriting yoki «unutdim» ni bosing");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/platform/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: forgotCurrent ? null : currentPassword,
          newPassword,
          skipCurrent: forgotCurrent,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        password?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setPwError(data.error ?? "Parolni o'zgartirishda xatolik");
        return;
      }
      setRevealedPassword(data.password ?? newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setForgotCurrent(false);
    } catch {
      setPwError("Tarmoq xatosi");
    } finally {
      setPwSaving(false);
    }
  }

  async function copyPassword() {
    if (!revealedPassword) return;
    try {
      await navigator.clipboard.writeText(revealedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setPwError("Nusxa olish amalga oshmadi");
    }
  }

  async function toggleNotify(
    key: "notifyNewCustomer" | "notifyPaymentOverdue" | "notifyWeeklyReport",
    value: boolean,
  ) {
    const prev = settings[key];
    setSettings({ ...settings, [key]: value });
    try {
      await patchSettings({ [key]: value });
    } catch (err) {
      setSettings({ ...settings, [key]: prev });
      setError(err instanceof Error ? err.message : "Saqlashda xatolik");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-stone-900">Sozlamalar</h1>
        <p className="mt-4 text-stone-500">Yuklanmoqda…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-stone-900">Sozlamalar</h1>
      <p className="mt-1 text-stone-500">Platforma sozlamalarini boshqaring</p>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <form
        onSubmit={(e) => void savePassword(e)}
        className="mt-8 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100"
      >
        <div>
          <h2 className="font-bold text-stone-900">Mening parolim</h2>
          <p className="mt-1 text-xs text-stone-500">
            Panelga kirgan bo&apos;lsangiz, joriy parolni unutsangiz ham yangisini
            qo&apos;yishingiz mumkin. Yangi parolni ko&apos;z tugmasi bilan
            ko&apos;ring va nusxa oling.
          </p>
        </div>
        {!forgotCurrent ? (
          <>
            <PasswordField
              label="Joriy parol"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <button
              type="button"
              onClick={() => {
                setForgotCurrent(true);
                setCurrentPassword("");
                setPwError(null);
              }}
              className="text-left text-xs font-semibold text-violet-700 hover:underline"
            >
              Joriy parolni unutdim — sessiyam orqali yangilash
            </button>
          </>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Joriy parol so&apos;ralmaydi — siz allaqachon platformaga kirgansiz.{" "}
            <button
              type="button"
              onClick={() => setForgotCurrent(false)}
              className="font-bold underline"
            >
              Ortga
            </button>
          </div>
        )}
        <PasswordField
          label="Yangi parol"
          required
          minLength={6}
          autoComplete="new-password"
          value={newPassword}
          onChange={setNewPassword}
        />
        <PasswordField
          label="Yangi parolni tasdiqlang"
          required
          minLength={6}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
        />
        {pwError ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {pwError}
          </p>
        ) : null}
        {revealedPassword ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-800">
              Parol yangilandi. Saqlab qo&apos;ying:
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-stone-900 ring-1 ring-emerald-100">
                {revealedPassword}
              </code>
              <button
                type="button"
                onClick={() => void copyPassword()}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "Nusxa" : "Nusxa olish"}
              </button>
            </div>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pwSaving}
          className="rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {pwSaving ? "Saqlanmoqda…" : "Parolni o'zgartirish"}
        </button>
      </form>

      <form
        onSubmit={(e) => void saveCompany(e)}
        className="mt-6 space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100"
      >
        <h2 className="font-bold text-stone-900">Umumiy ma&apos;lumotlar</h2>
        <label className="block text-sm">
          <span className="font-medium text-stone-600">Kompaniya nomi</span>
          <input
            required
            value={settings.companyName}
            onChange={(e) =>
              setSettings({ ...settings, companyName: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-600">Aloqa email</span>
          <input
            required
            type="email"
            value={settings.contactEmail}
            onChange={(e) =>
              setSettings({ ...settings, contactEmail: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-stone-600">Telefon</span>
          <input
            value={settings.contactPhone}
            onChange={(e) =>
              setSettings({ ...settings, contactPhone: e.target.value })
            }
            className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
          />
        </label>

        <div className="border-t border-stone-100 pt-5">
          <h3 className="font-bold text-stone-900">
            Kafe admin qo&apos;llab-quvvatlash
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            Kafe egalari panelda ko&apos;radigan telefon va ijtimoiy tarmoq
            havolalari
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="font-medium text-stone-600">Tugma nomi</span>
              <input
                value={settings.supportTitle}
                onChange={(e) =>
                  setSettings({ ...settings, supportTitle: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-stone-600">Telefon</span>
              <input
                value={settings.supportPhone}
                onChange={(e) =>
                  setSettings({ ...settings, supportPhone: e.target.value })
                }
                placeholder="+998 90 123 45 67"
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-stone-600">Telegram</span>
              <input
                value={settings.supportTelegram}
                onChange={(e) =>
                  setSettings({ ...settings, supportTelegram: e.target.value })
                }
                placeholder="@support yoki https://t.me/..."
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-stone-600">Instagram</span>
              <input
                value={settings.supportInstagram}
                onChange={(e) =>
                  setSettings({ ...settings, supportInstagram: e.target.value })
                }
                placeholder="@support yoki https://instagram.com/..."
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
              />
            </label>
          </div>
        </div>

        <div className="border-t border-stone-100 pt-5">
          <h3 className="font-bold text-stone-900">
            Ijtimoiy tarmoqlar (landing)
          </h3>
          <p className="mt-1 text-xs text-stone-500">
            To‘liq havola yoki @username — landing sahifada ikonka chiqadi. Bo‘sh
            qoldirilsa yashirinadi.
          </p>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="font-medium text-stone-600">Instagram</span>
              <input
                value={settings.socialInstagram}
                onChange={(e) =>
                  setSettings({ ...settings, socialInstagram: e.target.value })
                }
                placeholder="@rakhmnov_cafe yoki https://instagram.com/..."
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-stone-600">Telegram</span>
              <input
                value={settings.socialTelegram}
                onChange={(e) =>
                  setSettings({ ...settings, socialTelegram: e.target.value })
                }
                placeholder="@rakhmnov_cafe yoki https://t.me/..."
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-stone-600">Facebook</span>
              <input
                value={settings.socialFacebook}
                onChange={(e) =>
                  setSettings({ ...settings, socialFacebook: e.target.value })
                }
                placeholder="sahifa nomi yoki https://facebook.com/..."
                className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2.5"
              />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saqlanmoqda…" : "Saqlash"}
          </button>
          {saved && (
            <p className="text-sm font-medium text-emerald-600">Saqlandi</p>
          )}
        </div>
      </form>

      <section className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-100">
        <h2 className="font-bold text-stone-900">Bildirishnoma sozlamalari</h2>
        <Toggle
          label="Yangi mijoz qo'shilganda email yuborish"
          on={settings.notifyNewCustomer}
          onChange={(v) => void toggleNotify("notifyNewCustomer", v)}
        />
        <Toggle
          label="To'lov muddati o'tganda ogohlantirish"
          on={settings.notifyPaymentOverdue}
          onChange={(v) => void toggleNotify("notifyPaymentOverdue", v)}
        />
        <Toggle
          label="Haftalik hisobotni yuborish"
          on={settings.notifyWeeklyReport}
          onChange={(v) => void toggleNotify("notifyWeeklyReport", v)}
        />
      </section>

      <PlatformTariffSettings
        initial={{
          planCurrency: settings.planCurrency ?? "USD",
          planPrices: settings.planPrices,
          planDiscounts: settings.planDiscounts,
        }}
        onSave={async (tariff) => {
          await patchSettings(tariff);
          router.refresh();
        }}
      />
    </div>
  );
}

function Toggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          on ? "bg-violet-600" : "bg-stone-300"
        }`}
      >
        <span
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
            on ? "left-5" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
