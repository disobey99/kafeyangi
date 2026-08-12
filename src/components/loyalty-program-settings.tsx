"use client";

import { useEffect, useState } from "react";
import { NumberInput } from "@/components/ui/number-input";

type Settings = {
  loyaltyEnabled: boolean;
  loyaltyTerms: string;
  loyaltyProgramType: "CASHBACK" | "PROMOTIONS";
  loyaltyRedeemPeriod: "WEEK" | "MONTH";
  loyaltyCashbackPercent: number;
  socialInstagram: string;
  socialTelegram: string;
  socialFacebook: string;
  previewTerms: string;
  redeemPeriodLabel: string;
};

export function LoyaltyProgramSettings({ cafeId }: { cafeId: string }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/loyalty/settings`)
      .then((r) => r.json())
      .then((d) => setSettings(d));
  }, [cafeId]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/loyalty/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loyaltyEnabled: settings.loyaltyEnabled,
          loyaltyTerms: settings.loyaltyTerms || null,
          loyaltyProgramType: settings.loyaltyProgramType,
          loyaltyRedeemPeriod: settings.loyaltyRedeemPeriod,
          loyaltyCashbackPercent: settings.loyaltyCashbackPercent,
          socialInstagram: settings.socialInstagram || null,
          socialTelegram: settings.socialTelegram || null,
          socialFacebook: settings.socialFacebook || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Xatolik");
        return;
      }
      setSettings(data);
      setMessage("Saqlandi");
    } catch {
      setMessage("Ulanish xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return <p className="text-sm text-[var(--dp-muted)]">Yuklanmoqda...</p>;
  }

  return (
    <div className="rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] p-5 shadow-sm">
      <h3 className="font-semibold text-[var(--dp-text)]">Sodiqlik va ijtimoiy tarmoqlar</h3>
      <p className="mt-1 text-xs text-[var(--dp-muted)]">
        QR skanerlanganda mijoz ko&apos;radigan sozlamalar
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.loyaltyEnabled}
          onChange={(e) => setSettings({ ...settings, loyaltyEnabled: e.target.checked })}
        />
        Sodiqlik dasturini yoqish
      </label>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Dastur turi</span>
          <select
            value={settings.loyaltyProgramType}
            onChange={(e) =>
              setSettings({
                ...settings,
                loyaltyProgramType: e.target.value as Settings["loyaltyProgramType"],
              })
            }
            className="input mt-1 w-full"
          >
            <option value="CASHBACK">Keshbek</option>
            <option value="PROMOTIONS">Aksiyalar + keshbek</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Keshbek ishlatish davri</span>
          <select
            value={settings.loyaltyRedeemPeriod}
            onChange={(e) =>
              setSettings({
                ...settings,
                loyaltyRedeemPeriod: e.target.value as Settings["loyaltyRedeemPeriod"],
              })
            }
            className="input mt-1 w-full"
          >
            <option value="WEEK">Haftada bir marta</option>
            <option value="MONTH">Oyda bir marta</option>
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-medium">Keshbek foizi (%)</span>
        <NumberInput
          min={0}
          max={100}
          value={settings.loyaltyCashbackPercent || ""}
          onValueChange={(v) =>
            setSettings({
              ...settings,
              loyaltyCashbackPercent: v === "" ? 0 : v,
            })
          }
          placeholder="Masalan: 5"
          className="input mt-1 w-full"
        />
      </label>

      <label className="mt-4 block text-sm">
        <span className="font-medium">Shartlar matni (bo&apos;sh qoldirilsa — avtomatik)</span>
        <textarea
          value={settings.loyaltyTerms}
          onChange={(e) => setSettings({ ...settings, loyaltyTerms: e.target.value })}
          rows={4}
          className="input mt-1 w-full"
          placeholder={settings.previewTerms}
        />
      </label>

      <p className="mt-2 rounded-lg bg-[var(--dp-accent-soft)] p-3 text-xs text-[var(--dp-text)]">
        <strong>Ko&apos;rinish:</strong> {settings.previewTerms}
        <br />
        <span className="text-[var(--dp-accent)]">Ishlatish: {settings.redeemPeriodLabel}</span>
      </p>

      <h4 className="mt-6 text-sm font-semibold">Ijtimoiy tarmoqlar</h4>
      <div className="mt-2 space-y-2">
        <input
          value={settings.socialInstagram}
          onChange={(e) => setSettings({ ...settings, socialInstagram: e.target.value })}
          placeholder="Instagram URL"
          className="input w-full text-sm"
        />
        <input
          value={settings.socialTelegram}
          onChange={(e) => setSettings({ ...settings, socialTelegram: e.target.value })}
          placeholder="Telegram URL"
          className="input w-full text-sm"
        />
        <input
          value={settings.socialFacebook}
          onChange={(e) => setSettings({ ...settings, socialFacebook: e.target.value })}
          placeholder="Facebook URL"
          className="input w-full text-sm"
        />
      </div>

      {message && (
        <p className={`mt-3 text-sm ${message === "Saqlandi" ? "text-emerald-600" : "text-red-500"}`}>
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saqlanmoqda..." : "Saqlash"}
      </button>
    </div>
  );
}
