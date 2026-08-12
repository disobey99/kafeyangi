"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Check, Copy, ImagePlus, Lock, Sparkles, Trash2, Upload } from "lucide-react";

type Settings = {
  logoUrl: string | null;
  coverImageUrl: string | null;
  tagline: string;
  hoursMonFri: string;
  hoursSat: string;
  hoursSun: string;
  customDomain: string | null;
  platformSubdomain: string;
  menuPrimaryColor: string;
  minOrderAmountSom: number;
  deliveryFeeSom: number;
  deliveryTimeMinutes: number;
  deliveryEnabled: boolean;
  dailyReportEnabled: boolean;
  dailyReportHour: number;
  waiterServiceFeePercent: number;
  customDomainAllowed: boolean;
  platformRootDomain: string | null;
  suggestedPlatformHost: string | null;
  publicAppPath: string;
  planName: string | null;
};

export function CafeBusinessSettings({ cafeId }: { cafeId: string }) {
  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const fileInputId = useId();
  const coverInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/settings`);
    const data = await res.json();
    setS({
      logoUrl: data.logoUrl,
      coverImageUrl: data.coverImageUrl ?? null,
      tagline: data.tagline ?? "",
      hoursMonFri: data.businessHours?.monFri ?? "08:00 – 22:00",
      hoursSat: data.businessHours?.sat ?? "09:00 – 23:00",
      hoursSun: data.businessHours?.sun ?? "09:00 – 21:00",
      customDomain: data.customDomain,
      platformSubdomain: data.platformSubdomain ?? "",
      menuPrimaryColor: data.menuPrimaryColor ?? "#d97706",
      minOrderAmountSom: data.minOrderAmountSom ?? 0,
      deliveryFeeSom: data.deliveryFeeSom ?? 0,
      deliveryTimeMinutes: data.deliveryTimeMinutes ?? 45,
      deliveryEnabled: data.deliveryEnabled ?? true,
      dailyReportEnabled: data.dailyReportEnabled ?? true,
      dailyReportHour: data.dailyReportHour ?? 22,
      waiterServiceFeePercent: data.waiterServiceFeePercent ?? 0,
      customDomainAllowed: !!data.customDomainAllowed,
      platformRootDomain: data.platformRootDomain ?? null,
      suggestedPlatformHost: data.suggestedPlatformHost ?? null,
      publicAppPath: data.publicAppPath ?? "",
      planName: data.planName ?? null,
    });
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function uploadLogo(file: File) {
    setUploading(true);
    setError("");
    try {
      const { uploadCafeImage } = await import("@/lib/upload-client");
      const result = await uploadCafeImage(cafeId, file, s?.logoUrl);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setS((prev) => (prev ? { ...prev, logoUrl: result.url } : prev));
    } catch {
      setError("Logo yuklashda xatolik");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function uploadCover(file: File) {
    setUploadingCover(true);
    setError("");
    try {
      const { uploadCafeImage } = await import("@/lib/upload-client");
      const result = await uploadCafeImage(cafeId, file, s?.coverImageUrl);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setS((prev) => (prev ? { ...prev, coverImageUrl: result.url } : prev));
    } catch {
      setError("Cover yuklashda xatolik");
    } finally {
      setUploadingCover(false);
      if (coverRef.current) coverRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setLoading(true);
    setError("");

    const payload: Record<string, unknown> = {
      logoUrl: s.logoUrl,
      coverImageUrl: s.coverImageUrl,
      tagline: s.tagline.trim() || null,
      businessHours: {
        monFri: s.hoursMonFri.trim(),
        sat: s.hoursSat.trim(),
        sun: s.hoursSun.trim(),
      },
      menuPrimaryColor: s.menuPrimaryColor,
      minOrderAmountSom: s.minOrderAmountSom,
      deliveryFeeSom: s.deliveryFeeSom,
      deliveryTimeMinutes: s.deliveryTimeMinutes,
      deliveryEnabled: s.deliveryEnabled,
      dailyReportEnabled: s.dailyReportEnabled,
      dailyReportHour: s.dailyReportHour,
      waiterServiceFeePercent: s.waiterServiceFeePercent,
    };

    if (s.customDomainAllowed) {
      if (s.platformRootDomain) {
        payload.platformSubdomain = s.platformSubdomain.trim() || null;
      } else {
        payload.customDomain = s.customDomain?.trim() || null;
      }
    }

    const res = await fetch(`/api/cafes/${cafeId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Saqlashda xato");
      return;
    }
    setSaved(true);
    await load();
    setTimeout(() => setSaved(false), 3000);
  }

  async function testReport(period: "day" | "week") {
    setReportSending(true);
    await fetch(`/api/cafes/${cafeId}/settings?action=test-report&period=${period}`, {
      method: "POST",
    });
    setReportSending(false);
  }

  if (!s) return null;

  const previewHost =
    s.platformRootDomain && s.platformSubdomain.trim()
      ? `${s.platformSubdomain.trim().toLowerCase().replace(/_/g, "-")}.${s.platformRootDomain}`
      : s.suggestedPlatformHost;

  return (
    <form onSubmit={save} className="max-w-lg space-y-4">
      <div>
        <h2 className="font-semibold text-[var(--dp-text)]">Yetkazish va buyurtma</h2>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Onlayn savdo va yetkazish — Standard tarifda
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.deliveryEnabled}
          onChange={(e) => setS({ ...s, deliveryEnabled: e.target.checked })}
        />
        Yetkazish yoqilgan
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--dp-subtle)]">Minimal buyurtma (so&apos;m)</span>
        <input
          type="number"
          min={0}
          value={s.minOrderAmountSom}
          onChange={(e) => setS({ ...s, minOrderAmountSom: Number(e.target.value) })}
          className="input mt-1 w-full"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--dp-subtle)]">Yetkazish narxi (so&apos;m)</span>
        <input
          type="number"
          min={0}
          value={s.deliveryFeeSom}
          onChange={(e) => setS({ ...s, deliveryFeeSom: Number(e.target.value) })}
          className="input mt-1 w-full"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--dp-subtle)]">Yetkazish vaqti (daqiqa)</span>
        <input
          type="number"
          min={5}
          max={240}
          value={s.deliveryTimeMinutes}
          onChange={(e) => setS({ ...s, deliveryTimeMinutes: Number(e.target.value) })}
          className="input mt-1 w-full"
        />
      </label>

      {s.publicAppPath ? (
        <div className="space-y-2 rounded-xl bg-[var(--dp-surface-2)] px-3 py-3 text-xs text-[var(--dp-muted)]">
          <p className="font-semibold text-[var(--dp-text)]">Mijoz / kuryer ilova havolalari</p>
          <p className="text-[11px] opacity-90">
            Havolani yuboring — ochganda o‘rnatish chiqadi. Subdomen: kafe sayti (meny + yuklab olish).
          </p>
          {(
            [
              {
                key: "site",
                label: "Kafe sayti",
                path: s.publicAppPath.replace(/\/app\/?$/, "") || `/c/...`,
              },
              { key: "app", label: "Mijoz ilovasi", path: s.publicAppPath },
              {
                key: "courier",
                label: "Kuryer ilovasi",
                path: `${s.publicAppPath}${s.publicAppPath.includes("?") ? "&" : "?"}mode=courier`,
              },
            ] as const
          ).map((row) => {
            const abs =
              typeof window !== "undefined"
                ? `${window.location.origin}${row.path}`
                : row.path;
            const pretty = previewHost
              ? row.key === "site"
                ? `https://${previewHost}`
                : row.key === "app"
                  ? `https://${previewHost}/app`
                  : `https://${previewHost}/app?mode=courier`
              : abs;
            return (
              <div
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--dp-card)] px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--dp-muted)]">
                    {row.label}
                  </p>
                  <p className="truncate font-semibold text-[var(--dp-text)]">{pretty}</p>
                </div>
                <button
                  type="button"
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--dp-border)] px-2 py-1.5 text-[11px] font-bold text-[var(--dp-text)] hover:bg-[var(--dp-surface-2)]"
                  onClick={() => {
                    void navigator.clipboard.writeText(pretty).then(() => {
                      setCopiedKey(row.key);
                      window.setTimeout(() => setCopiedKey(null), 1600);
                    });
                  }}
                >
                  {copiedKey === row.key ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Nusxa
                </button>
              </div>
            );
          })}
        </div>
      ) : null}

      <hr className="border-[var(--dp-border-subtle)]" />

      <div>
        <h2 className="font-semibold text-[var(--dp-text)]">Ofitsiant xizmat foizi</h2>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Ofitsiant orqali kelgan buyurtmaga avtomatik qo&apos;shiladi
        </p>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-[var(--dp-subtle)]">Foiz (%)</span>
        <input
          type="number"
          min={0}
          max={100}
          value={s.waiterServiceFeePercent}
          onChange={(e) =>
            setS({ ...s, waiterServiceFeePercent: Number(e.target.value) })
          }
          className="input mt-1 w-full"
        />
        <p className="mt-1 text-xs text-[var(--dp-muted)]">
          0 = o&apos;chirilgan. Masalan 10 = jami summaning 10% xizmat haqi
        </p>
      </label>

      <hr className="border-[var(--dp-border-subtle)]" />

      <div>
        <h2 className="font-semibold text-[var(--dp-text)]">Brend</h2>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Logo kvadrat bo&apos;lsin — tavsiya: 512×512 px, PNG/JPG, max 5 MB
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--dp-border)] bg-[var(--dp-card-header)]">
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.logoUrl}
              alt="Kafe logosi"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlus className="h-7 w-7 text-[var(--dp-muted)]" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <input
            ref={fileRef}
            id={fileInputId}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={uploading || loading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadLogo(file);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={fileInputId}
              className={`btn btn-secondary inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
                uploading || loading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <Upload className="h-4 w-4" aria-hidden />
              {uploading ? "Yuklanmoqda…" : "Rasm yuklash"}
            </label>
            {s.logoUrl && (
              <button
                type="button"
                disabled={uploading || loading}
                onClick={() => setS({ ...s, logoUrl: null })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm font-semibold text-[var(--dp-muted)] hover:bg-[var(--dp-card-header)] disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Olib tashlash
              </button>
            )}
          </div>
          <p className="text-xs text-[var(--dp-muted)]">
            Yuklagach pastidagi «Saqlash» ni bosing
          </p>
        </div>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-[var(--dp-subtle)]">
          Logo URL (ixtiyoriy)
        </span>
        <input
          value={s.logoUrl ?? ""}
          onChange={(e) => setS({ ...s, logoUrl: e.target.value || null })}
          placeholder="https://... yoki /uploads/..."
          className="input mt-1 w-full"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--dp-subtle)]">Menyu rangi</span>
        <input
          type="color"
          value={s.menuPrimaryColor}
          onChange={(e) => setS({ ...s, menuPrimaryColor: e.target.value })}
          className="mt-1 h-10 w-full cursor-pointer rounded-lg"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--dp-subtle)]">
          Sayt slogani (tagline)
        </span>
        <input
          value={s.tagline}
          onChange={(e) => setS({ ...s, tagline: e.target.value })}
          maxLength={160}
          placeholder="Masalan: Chilonzordagi sevimli ta'm"
          className="input mt-1 w-full"
        />
      </label>

      <div className="rounded-2xl border border-[var(--dp-border-subtle)] p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-[var(--dp-text)]">Ish soatlari (sayt)</h2>
          <p className="mt-1 text-xs text-[var(--dp-muted)]">
            Mijoz subdomen saytida ko&apos;rinadi. Login kerak emas.
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-[var(--dp-subtle)]">Du–Ju</span>
          <input
            value={s.hoursMonFri}
            onChange={(e) => setS({ ...s, hoursMonFri: e.target.value })}
            placeholder="08:00 – 22:00"
            className="input mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--dp-subtle)]">Shanba</span>
          <input
            value={s.hoursSat}
            onChange={(e) => setS({ ...s, hoursSat: e.target.value })}
            placeholder="09:00 – 23:00"
            className="input mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-[var(--dp-subtle)]">Yakshanba</span>
          <input
            value={s.hoursSun}
            onChange={(e) => setS({ ...s, hoursSun: e.target.value })}
            placeholder="09:00 – 21:00"
            className="input mt-1 w-full"
          />
        </label>
      </div>

      <div>
        <p className="text-sm font-medium text-[var(--dp-subtle)]">
          Sayt cover (hero fon)
        </p>
        <p className="mt-1 text-xs text-[var(--dp-muted)]">
          Keng rasm tavsiya: 1600×900 yoki undan katta. Bo&apos;lmasa taom
          rasmlaridan olinadi.
        </p>
        <div className="mt-3 overflow-hidden rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card-header)]">
          {s.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.coverImageUrl}
              alt="Cover"
              className="h-36 w-full object-cover"
            />
          ) : (
            <div className="flex h-36 items-center justify-center text-sm text-[var(--dp-muted)]">
              Cover yo&apos;q
            </div>
          )}
        </div>
        <input
          ref={coverRef}
          id={coverInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={uploadingCover || loading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadCover(file);
          }}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <label
            htmlFor={coverInputId}
            className={`btn btn-secondary inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm ${
              uploadingCover || loading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <Upload className="h-4 w-4" aria-hidden />
            {uploadingCover ? "Yuklanmoqda…" : "Cover yuklash"}
          </label>
          {s.coverImageUrl && (
            <button
              type="button"
              disabled={uploadingCover || loading}
              onClick={() => setS({ ...s, coverImageUrl: null })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm font-semibold text-[var(--dp-muted)] hover:bg-[var(--dp-card-header)] disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Olib tashlash
            </button>
          )}
        </div>
      </div>

      <hr className="border-[var(--dp-border-subtle)]" />

      <div className="rounded-2xl border border-[var(--dp-border-subtle)] p-4">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-semibold text-[var(--dp-text)]">Kafe sayti (subdomain)</h2>
            <p className="mt-1 text-sm text-[var(--dp-muted)]">
              Faqat Pro — masalan{" "}
              <span className="font-medium text-[var(--dp-text)]">
                nomingiz.{s.platformRootDomain || "kafenomi.uz"}
              </span>
            </p>
          </div>
        </div>

        {!s.customDomainAllowed ? (
          <div className="mt-4 rounded-xl bg-amber-500/10 px-3 py-3 text-sm text-amber-950 dark:text-amber-100">
            <p className="flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4" />
              Pro tarif kerak
            </p>
            <p className="mt-1 text-xs opacity-90">
              Joriy: {s.planName ?? "—"}. Standard da onlayn savdo{" "}
              <code className="rounded bg-black/5 px-1">{s.publicAppPath || "/c/.../app"}</code>{" "}
              orqali ishlaydi; chiroyli subdomain Pro da.
            </p>
            <Link href="/#pricing" className="mt-3 inline-flex text-xs font-bold underline">
              Tariflarni ko&apos;rish
            </Link>
          </div>
        ) : s.platformRootDomain ? (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-[var(--dp-subtle)]">Subdomain</span>
              <div className="mt-1 flex items-center gap-2">
                <input
                  value={s.platformSubdomain}
                  onChange={(e) => setS({ ...s, platformSubdomain: e.target.value })}
                  placeholder="nomingiz"
                  className="input min-w-0 flex-1"
                />
                <span className="shrink-0 text-sm text-[var(--dp-muted)]">
                  .{s.platformRootDomain}
                </span>
              </div>
            </label>
            {previewHost ? (
              <p className="text-xs text-[var(--dp-muted)]">
                Mijozlar kiradi:{" "}
                <span className="font-semibold text-[var(--dp-text)]">https://{previewHost}</span>
              </p>
            ) : null}
            <p className="text-[11px] text-[var(--dp-muted)]">
              DNS: <code>*.{s.platformRootDomain}</code> → server. Pro kafelar uchun slug
              bilan ham ochiladi (masalan {s.suggestedPlatformHost}).
            </p>
          </div>
        ) : (
          <label className="mt-4 block">
            <span className="text-sm font-medium text-[var(--dp-subtle)]">To&apos;liq domen</span>
            <input
              value={s.customDomain ?? ""}
              onChange={(e) => setS({ ...s, customDomain: e.target.value || null })}
              placeholder="menu.mening-kafem.uz"
              className="input mt-1 w-full"
            />
            <p className="mt-1 text-xs text-[var(--dp-muted)]">
              PLATFORM_ROOT_DOMAIN hali sozlanmagan — to&apos;liq o&apos;z domeningizni
              yozing (DNS A → server).
            </p>
          </label>
        )}
      </div>

      <hr className="border-[var(--dp-border-subtle)]" />

      <div>
        <h2 className="font-semibold text-[var(--dp-text)]">Kunlik Telegram hisobot</h2>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.dailyReportEnabled}
          onChange={(e) => setS({ ...s, dailyReportEnabled: e.target.checked })}
        />
        Avtomatik hisobot yoqilgan
      </label>

      <label className="block">
        <span className="text-sm font-medium text-[var(--dp-subtle)]">Yuborish soati (0-23)</span>
        <input
          type="number"
          min={0}
          max={23}
          value={s.dailyReportHour}
          onChange={(e) => setS({ ...s, dailyReportHour: Number(e.target.value) })}
          className="input mt-1 w-full"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={reportSending}
          onClick={() => testReport("day")}
          className="btn btn-secondary text-sm"
        >
          Kunlik test
        </button>
        <button
          type="button"
          disabled={reportSending}
          onClick={() => testReport("week")}
          className="btn btn-secondary text-sm"
        >
          Haftalik test
        </button>
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary">
        {loading ? "Saqlanmoqda..." : "Saqlash"}
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {saved && <p className="text-sm text-emerald-600">Saqlandi!</p>}
    </form>
  );
}
