"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, ExternalLink, Check, Lock } from "lucide-react";
import Link from "next/link";

export function TelegramSettings({
  cafeId,
  embedded = false,
}: {
  cafeId: string;
  embedded?: boolean;
}) {
  const [webAppUrl, setWebAppUrl] = useState("");
  const [pwaUrl, setPwaUrl] = useState("");
  const [botStartUrl, setBotStartUrl] = useState("");
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [botConfigured, setBotConfigured] = useState(false);
  const [telegramAllowed, setTelegramAllowed] = useState(true);
  const [botEnabled, setBotEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [planName, setPlanName] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/settings`);
    const data = await res.json();
    setWebAppUrl(data.telegramWebAppUrl ?? "");
    setPwaUrl(data.telegramPwaUrl ?? "");
    setBotStartUrl(data.telegramBotStartUrl ?? "");
    setBotUsername(data.telegramBotUsername ?? null);
    setBotConfigured(!!data.botConfigured);
    setTelegramAllowed(data.telegramFeatureAllowed !== false);
    setBotEnabled(data.telegramBotEnabled !== false);
    setPlanName(data.planName ?? null);
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function copy(text: string, key: string) {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  async function setEnabled(next: boolean) {
    if (saving) return;
    setSaving(true);
    setSaveMsg(null);
    const prev = botEnabled;
    setBotEnabled(next);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegramBotEnabled: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBotEnabled(prev);
        setSaveMsg(data.error ?? "Saqlanmadi");
        return;
      }
      setSaveMsg(next ? "Bot yoqildi" : "Bot o‘chirildi — saytda tugma chiqmaydi");
      await load();
      setTimeout(() => setSaveMsg(null), 2500);
    } catch {
      setBotEnabled(prev);
      setSaveMsg("Tarmoq xatosi");
    } finally {
      setSaving(false);
    }
  }

  if (!telegramAllowed) {
    return (
      <div>
        {embedded && (
          <div className="mb-4">
            <h2 className="font-semibold text-[var(--dp-text)]">Telegram bot</h2>
            <p className="mt-1 text-sm text-[var(--dp-muted)]">
              Mijozlar bot orqali buyurtma beradi (PWA bilan bir xil)
            </p>
          </div>
        )}
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Standard yoki Pro tarif kerak</p>
            <p className="mt-1 opacity-90">
              Hozirgi tarif: {planName ?? "Starter"}. Telegram bot + Web App buyurtma
              Standard/Pro da ochiladi.
            </p>
            <Link
              href={`/dashboard/${cafeId}/subscription`}
              className="mt-2 inline-block font-bold underline"
            >
              Tarifni yangilash
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {embedded && (
        <div className="mb-4">
          <h2 className="font-semibold text-[var(--dp-text)]">Telegram bot</h2>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            Bitta platforma boti — xohlasangiz kafengiz uchun o‘chirib qo‘yishingiz mumkin
          </p>
        </div>
      )}

      <div className="max-w-lg space-y-4">
        {!botConfigured && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
            Bot token sozlanmagan. Platforma <code>.env</code> da{" "}
            <code>TELEGRAM_BOT_TOKEN</code> (mijoz) va ixtiyoriy{" "}
            <code>TELEGRAM_SUPPORT_BOT_TOKEN</code> (support) bo&apos;lishi kerak.
          </p>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() => void setEnabled(!botEnabled)}
          className="flex w-full items-center justify-between gap-4 rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] px-4 py-3 text-left disabled:opacity-50"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--dp-text)]">
              Mijoz Telegram botini yoqish
            </p>
            <p className="mt-0.5 text-xs text-[var(--dp-muted)]">
              O‘chirilsa: sayt/subdomen tugmasi, deep-link va botdagi kafe
              ro‘yxatidan chiqadi
            </p>
          </div>
          <span
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              botEnabled ? "bg-[var(--dp-accent)]" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                botEnabled ? "left-5" : "left-0.5"
              }`}
            />
          </span>
        </button>
        {saveMsg ? (
          <p className="text-xs font-medium text-emerald-700">{saveMsg}</p>
        ) : null}

        {!botEnabled ? (
          <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-600">
            Bot hozir o‘chirilgan. Qayta yoqish uchun yuqoridagi tugmani bosing.
          </p>
        ) : (
          <>
            <div className="space-y-2 text-sm text-[var(--dp-muted)]">
              <p className="font-medium text-[var(--dp-text)]">Mijozlarga yuboring</p>
              <p>
                Quyidagi bot havolasini ochganda sizning kafengiz tanlanadi. Ichida{" "}
                <strong>Buyurtma</strong> (Web App) va{" "}
                <strong>Ilovani yuklab olish</strong> tugmalari chiqadi.
              </p>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-[var(--dp-subtle)]">
                Bot deep-link (asosiy)
              </span>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={botStartUrl}
                  className="input min-w-0 flex-1 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => void copy(botStartUrl, "start")}
                  className="btn btn-secondary shrink-0 px-3"
                  title="Nusxalash"
                >
                  {copiedKey === "start" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
                {botStartUrl ? (
                  <a
                    href={botStartUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary shrink-0 px-3"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--dp-subtle)]">
                Web App URL (Buyurtma)
              </span>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={webAppUrl}
                  className="input min-w-0 flex-1 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => void copy(webAppUrl, "web")}
                  className="btn btn-secondary shrink-0 px-3"
                >
                  {copiedKey === "web" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[var(--dp-subtle)]">
                Ilova (APK yuklab olish)
              </span>
              <div className="mt-1 flex gap-2">
                <input
                  readOnly
                  value={pwaUrl}
                  className="input min-w-0 flex-1 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => void copy(pwaUrl, "pwa")}
                  className="btn btn-secondary shrink-0 px-3"
                >
                  {copiedKey === "pwa" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>

            {botUsername && (
              <p className="text-sm text-[var(--dp-muted)]">
                Bot:{" "}
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[var(--dp-accent)]"
                >
                  @{botUsername}
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
