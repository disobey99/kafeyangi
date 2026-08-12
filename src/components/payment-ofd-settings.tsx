"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

type PayOfdSettings = {
  paymeEnabled: boolean;
  paymeMerchantId: string;
  paymeConfigured: boolean;
  paymeWebhookUrl: string;
  ofdEnabled: boolean;
  ofdTin: string;
  ofdCompanyName: string;
  ofdFmNumber: string;
};

export function PaymentOfdSettings({ cafeId }: { cafeId: string }) {
  const [s, setS] = useState<(PayOfdSettings & { paymeKey: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/settings`);
    const data = await res.json();
    setS({
      paymeEnabled: data.paymeEnabled ?? false,
      paymeMerchantId: data.paymeMerchantId ?? "",
      paymeKey: "",
      paymeConfigured: data.paymeConfigured ?? false,
      paymeWebhookUrl: data.paymeWebhookUrl ?? "",
      ofdEnabled: data.ofdEnabled ?? false,
      ofdTin: data.ofdTin ?? "",
      ofdCompanyName: data.ofdCompanyName ?? "",
      ofdFmNumber: data.ofdFmNumber ?? "",
    });
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setLoading(true);
    const payload: Record<string, unknown> = {
      paymeEnabled: s.paymeEnabled,
      paymeMerchantId: s.paymeMerchantId || null,
      ofdEnabled: s.ofdEnabled,
      ofdTin: s.ofdTin || null,
      ofdCompanyName: s.ofdCompanyName || null,
      ofdFmNumber: s.ofdFmNumber || null,
    };
    if (s.paymeKey.trim()) payload.paymeKey = s.paymeKey.trim();

    await fetch(`/api/cafes/${cafeId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    load();
  }

  if (!s) return null;

  return (
    <form onSubmit={save} className="max-w-lg space-y-6">
      <div>
        <h2 className="font-semibold text-[var(--dp-text)]">Payme to&apos;lov</h2>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Onlayn buyurtmada Payme orqali to&apos;lash
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.paymeEnabled}
          onChange={(e) => setS({ ...s, paymeEnabled: e.target.checked })}
        />
        Payme yoqilgan
      </label>

      <label className="block">
        <span className="text-sm text-[var(--dp-subtle)]">Merchant ID</span>
        <input
          className="input mt-1 w-full"
          value={s.paymeMerchantId}
          onChange={(e) => setS({ ...s, paymeMerchantId: e.target.value })}
          placeholder="Payme kabinetidan"
        />
      </label>

      <label className="block">
        <span className="text-sm text-[var(--dp-subtle)]">API kalit (Key)</span>
        <input
          type="password"
          className="input mt-1 w-full"
          value={s.paymeKey}
          onChange={(e) => setS({ ...s, paymeKey: e.target.value })}
          placeholder={s.paymeConfigured ? "•••• saqlangan (o'zgartirish uchun yozing)" : "Payme key"}
        />
      </label>

      {s.paymeWebhookUrl && (
        <div>
          <span className="text-sm text-[var(--dp-subtle)]">Webhook URL (Payme kabinetiga)</span>
          <div className="mt-1 flex gap-2">
            <input readOnly className="input min-w-0 flex-1 font-mono text-xs" value={s.paymeWebhookUrl} />
            <button
              type="button"
              className="btn btn-secondary px-3"
              onClick={async () => {
                await navigator.clipboard.writeText(s.paymeWebhookUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      <hr className="border-[var(--dp-border)]" />

      <div>
        <h2 className="font-semibold text-[var(--dp-text)]">OFD fiskal chek</h2>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Stol yopilganda yoki to&apos;lovdan keyin fiskal chek raqami va QR
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.ofdEnabled}
          onChange={(e) => setS({ ...s, ofdEnabled: e.target.checked })}
        />
        OFD yoqilgan
      </label>

      <label className="block">
        <span className="text-sm text-[var(--dp-subtle)]">STIR (INN)</span>
        <input
          className="input mt-1 w-full"
          value={s.ofdTin}
          onChange={(e) => setS({ ...s, ofdTin: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm text-[var(--dp-subtle)]">Korxona nomi</span>
        <input
          className="input mt-1 w-full"
          value={s.ofdCompanyName}
          onChange={(e) => setS({ ...s, ofdCompanyName: e.target.value })}
        />
      </label>

      <label className="block">
        <span className="text-sm text-[var(--dp-subtle)]">FN serial raqam</span>
        <input
          className="input mt-1 w-full"
          value={s.ofdFmNumber}
          onChange={(e) => setS({ ...s, ofdFmNumber: e.target.value })}
          placeholder="Masalan: FM123456789"
        />
      </label>

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "..." : "Saqlash"}
      </button>
      {saved && <p className="text-sm text-emerald-600">Saqlandi!</p>}
    </form>
  );
}
