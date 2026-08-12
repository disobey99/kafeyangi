"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, MapPin, RefreshCw } from "lucide-react";
import { ensureSlug, slugify } from "@/lib/utils";
import { AuthShell } from "@/components/ui/auth-shell";
import {
  forwardGeocodeClient,
  getClientLocation,
  reverseGeocodeClient,
} from "@/lib/client-geolocation";

type GeoStatus =
  | "idle"
  | "detecting"
  | "ready"
  | "denied"
  | "unsupported"
  | "timeout"
  | "error"
  | "lookup";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [addressHint, setAddressHint] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [form, setForm] = useState({
    cafeName: "",
    slug: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    region: "",
  });
  const addressLookupSeq = useRef(0);
  const skipNextLookup = useRef(false);

  async function detectLocation(manual = false) {
    setGeoStatus("detecting");
    const geo = await getClientLocation();
    if (!geo.ok) {
      setGeoStatus(geo.reason === "denied" ? "denied" : geo.reason);
      if (manual && geo.reason === "denied") {
        setError("Joylashuv ruxsati berilmadi. Manzilni qo'lda kiriting.");
      }
      return;
    }

    try {
      const location = await reverseGeocodeClient(geo.latitude, geo.longitude);
      setCoords({ latitude: geo.latitude, longitude: geo.longitude });
      skipNextLookup.current = true;
      setForm((f) => ({
        ...f,
        address: f.address.trim() ? f.address : location.address,
        region: location.region ?? f.region,
      }));
      setAddressHint("");
      setGeoStatus("ready");
      setError("");
    } catch {
      setCoords({ latitude: geo.latitude, longitude: geo.longitude });
      setGeoStatus("ready");
    }
  }

  useEffect(() => {
    void detectLocation();
  }, []);

  useEffect(() => {
    const query = form.address.trim();
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }
    if (query.length < 5) {
      setAddressHint("");
      return;
    }

    const seq = ++addressLookupSeq.current;
    const timer = window.setTimeout(() => {
      void (async () => {
        setGeoStatus((s) => (s === "ready" ? s : "lookup"));
        setAddressHint("Manzil aniqlanmoqda…");
        try {
          const location = await forwardGeocodeClient(
            query,
            coords ?? undefined,
          );
          if (seq !== addressLookupSeq.current) return;
          skipNextLookup.current = true;
          setCoords({
            latitude: location.latitude,
            longitude: location.longitude,
          });
          setForm((f) => ({
            ...f,
            address: location.address,
            region: location.region ?? f.region,
          }));
          setAddressHint("Aniqlangan aniq manzil qo‘yildi");
          setGeoStatus("ready");
          setError("");
        } catch {
          if (seq !== addressLookupSeq.current) return;
          setAddressHint("Aniq manzil topilmadi — batafsilroq yozing (shahar, ko‘cha)");
          setGeoStatus((s) => (s === "ready" || s === "denied" ? s : "error"));
        }
      })();
    }, 750);

    return () => window.clearTimeout(timer);
    // coords intentionally omitted — near bias from last known coords only
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on address text
  }, [form.address]);

  function updateSlug(name: string) {
    setForm((f) => ({
      ...f,
      cafeName: name,
      slug: f.slug || slugify(name),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const slug = ensureSlug(form.slug || form.cafeName);
    let latitude = coords?.latitude;
    let longitude = coords?.longitude;
    let address = form.address.trim();
    let region = form.region.trim();

    // Yuborishdan oldin yana bir marta aniq manzilni topish
    if (address && (latitude == null || longitude == null)) {
      try {
        const location = await forwardGeocodeClient(address);
        latitude = location.latitude;
        longitude = location.longitude;
        address = location.address;
        region = location.region ?? region;
        skipNextLookup.current = true;
        setCoords({ latitude, longitude });
        setForm((f) => ({ ...f, address, region }));
        setGeoStatus("ready");
      } catch {
        /* matn bo‘yicha saqlanadi */
      }
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeName: form.cafeName.trim(),
          slug,
          ownerName: form.ownerName.trim(),
          email: form.email.trim(),
          password: form.password,
          phone: form.phone.trim() || undefined,
          address: address || undefined,
          region: region || undefined,
          latitude,
          longitude,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Kafe ochish"
      subtitle="14 kun bepul sinov — karta talab qilinmaydi"
      footer={
        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Hisobingiz bormi?{" "}
          <Link href="/login" className="font-semibold text-[var(--brand)] hover:underline">
            Kirish
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)]/15 text-[var(--brand)]">
                {geoStatus === "detecting" || geoStatus === "lookup" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">
                  Kafe joylashuvi
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {geoStatus === "detecting" && "Joylashuv aniqlanmoqda…"}
                  {geoStatus === "lookup" && "Yozilgan manzil xaritada qidirilmoqda…"}
                  {geoStatus === "ready" &&
                    (form.region
                      ? `${form.region} · xaritada aniq ko‘rinadi`
                      : "Koordinata saqlandi · xaritada ko‘rinadi")}
                  {geoStatus === "denied" &&
                    "Ruxsat berilmadi — pastda manzilni yozing, aniq manzil chiqadi"}
                  {geoStatus === "unsupported" &&
                    "Brauzer joylashuvni qo‘llab-quvvatlamaydi"}
                  {geoStatus === "timeout" && "Joylashuv vaqti tugadi — qayta urinib ko‘ring"}
                  {geoStatus === "error" && "Joylashuv aniqlanmadi — manzilni qo‘lda yozing"}
                  {geoStatus === "idle" && "Joylashuv so‘ralmoqda…"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void detectLocation(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--brand)]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Qayta
            </button>
          </div>
        </div>

        <Field label="Kafe nomi">
          <input
            required
            value={form.cafeName}
            onChange={(e) => updateSlug(e.target.value)}
            className="input"
            placeholder="Choyxona Bahor"
          />
        </Field>

        <Field label="Kafe manzili (URL)">
          <div className="flex items-center gap-1">
            <span className="shrink-0 text-sm text-[var(--muted-foreground)]">/c/</span>
            <input
              required
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: slugify(e.target.value) })
              }
              className="input"
              placeholder="choyxona-bahor"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Lotin harflari va tire. Bo&apos;sh qolsa avtomatik yaratiladi.
          </p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Egasi ismi">
            <input
              required
              value={form.ownerName}
              onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Telefon">
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              placeholder="+998 90 123 45 67"
            />
          </Field>
        </div>

        <Field label="Email">
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Parol">
          <input
            required
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="input"
          />
        </Field>

        <Field label="Fizik manzil">
          <input
            value={form.address}
            onChange={(e) => {
              setForm({ ...form, address: e.target.value });
              setAddressHint("");
            }}
            className="input"
            placeholder="Masalan: Seoul, Gangnam… yoki Toshkent, Chilonzor…"
            autoComplete="street-address"
          />
          {addressHint && (
            <p
              className={`mt-1 text-xs ${
                addressHint.includes("topilmadi")
                  ? "text-amber-600"
                  : "text-emerald-600"
              }`}
            >
              {addressHint}
            </p>
          )}
          {form.region && (
            <p className="mt-1 text-xs text-emerald-600">Hudud: {form.region}</p>
          )}
        </Field>

        {error && (
          <p className="badge badge-red w-full justify-center px-3 py-2 text-sm">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary w-full py-3">
          {loading ? "Ro'yxatdan o'tilmoqda..." : "Ro'yxatdan o'tish"}
        </button>
      </form>
    </AuthShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
