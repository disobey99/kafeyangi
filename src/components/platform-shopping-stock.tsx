"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Package,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";

type StockProduct = {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  lowStockAt: number;
  status: string;
  category: { name: string } | null;
};

type Movement = {
  id: string;
  type: string;
  qty: number;
  delta: number;
  balanceAfter: number;
  note: string | null;
  orderId: string | null;
  createdAt: string;
  product: { id: string; name: string; sku: string | null };
};

const TYPE_UZ: Record<string, string> = {
  IN: "Kirim",
  OUT: "Chiqim",
  ADJUST: "Tuzatish",
  SALE: "Sotuv",
  REFUND: "Qaytarish",
};

export function PlatformShoppingStock() {
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [stats, setStats] = useState({
    products: 0,
    lowCount: 0,
    zeroCount: 0,
    totalUnits: 0,
  });
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [productId, setProductId] = useState("");
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [lowStockAt, setLowStockAt] = useState("5");

  const load = useCallback(async () => {
    setError("");
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(`/api/platform/shopping/stock${lowOnly ? "?low=1" : ""}`),
        fetch("/api/platform/shopping/stock/movements?take=60"),
      ]);
      const sData = (await sRes.json()) as {
        products?: StockProduct[];
        stats?: typeof stats;
        error?: string;
      };
      const mData = (await mRes.json()) as { movements?: Movement[] };
      if (!sRes.ok) {
        setError(sData.error || "Yuklanmadi");
        return;
      }
      setProducts(sData.products ?? []);
      if (sData.stats) setStats(sData.stats);
      setMovements(mData.movements ?? []);
      setProductId((current) => {
        if (current) return current;
        const first = sData.products?.[0];
        if (first) {
          setLowStockAt(String(first.lowStockAt ?? 5));
          return first.id;
        }
        return current;
      });
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }, [lowOnly]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const p = products.find((x) => x.id === productId);
    if (p) setLowStockAt(String(p.lowStockAt ?? 5));
  }, [productId, products]);

  async function submitMove(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/platform/shopping/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          type,
          qty: Number(qty),
          note: note || null,
          lowStockAt: Number(lowStockAt) || 0,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Saqlanmadi");
        return;
      }
      setQty("");
      setNote("");
      await load();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Mahsulotlar", value: stats.products },
          { label: "Jami dona", value: stats.totalUnits },
          { label: "Kam qoldiq", value: stats.lowCount },
          { label: "Tugagan (0)", value: stats.zeroCount },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              {c.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setLowOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 ${
            lowOnly
              ? "bg-amber-100 text-amber-900 ring-amber-200"
              : "bg-white text-stone-600 ring-stone-200"
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Faqat kam qoldiq
        </button>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Yangilash
        </button>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <form
          onSubmit={(e) => void submitMove(e)}
          className="space-y-3 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2"
        >
          <h2 className="flex items-center gap-2 font-bold text-stone-900">
            <Package className="h-4 w-4 text-violet-600" />
            Ombor harakati
          </h2>
          <select
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          >
            <option value="">Mahsulot tanlang</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.stock} dona
              </option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["IN", "Kirim", ArrowDownToLine],
                ["OUT", "Chiqim", ArrowUpFromLine],
                ["ADJUST", "Belgilash", SlidersHorizontal],
              ] as const
            ).map(([t, label, Icon]) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs font-bold ${
                  type === t
                    ? "border-violet-500 bg-violet-50 text-violet-800"
                    : "border-stone-200 text-stone-600"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <input
            required
            type="number"
            min={type === "ADJUST" ? 0 : 1}
            placeholder={
              type === "ADJUST" ? "Yangi qoldiq (dona)" : "Miqdor (dona)"
            }
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
          <input
            type="number"
            min={0}
            placeholder="Kam qoldiq chegarasi"
            value={lowStockAt}
            onChange={(e) => setLowStockAt(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Izoh (ixtiyoriy)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !productId}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Saqlash
          </button>
          <p className="text-xs text-stone-500">
            Sotuv avtomatik kamaytiradi. Buyurtma bekor qilinsa — qoldiq
            qaytadi. Barcha harakatlar jurnalda saqlanadi.
          </p>
        </form>

        <div className="space-y-2 lg:col-span-3">
          <h2 className="font-bold text-stone-900">Qoldiqlar</h2>
          {loading && products.length === 0 && (
            <p className="text-sm text-stone-500">Yuklanmoqda…</p>
          )}
          {products.map((p) => {
            const low = p.stock <= p.lowStockAt;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setProductId(p.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left shadow-sm ${
                  productId === p.id
                    ? "border-violet-300 bg-violet-50"
                    : "border-stone-200 bg-white"
                }`}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">{p.name}</p>
                  <p className="text-xs text-stone-500">
                    {p.category?.name ?? "Kategoriyasiz"}
                    {p.sku ? ` · ${p.sku}` : ""} · {p.status}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-lg font-extrabold ${
                      p.stock <= 0
                        ? "text-red-600"
                        : low
                          ? "text-amber-700"
                          : "text-emerald-700"
                    }`}
                  >
                    {p.stock}
                  </p>
                  <p className="text-[10px] text-stone-400">
                    chegara: {p.lowStockAt}
                  </p>
                </div>
              </button>
            );
          })}
          {!loading && products.length === 0 && (
            <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
              Mahsulot yo‘q yoki filtr bo‘sh.
            </p>
          )}
        </div>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-stone-900">Harakatlar jurnali</h2>
        <ul className="mt-3 divide-y divide-stone-100">
          {movements.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm"
            >
              <div>
                <p className="font-semibold text-stone-900">
                  {m.product.name}{" "}
                  <span className="font-medium text-stone-500">
                    · {TYPE_UZ[m.type] ?? m.type}
                  </span>
                </p>
                <p className="text-xs text-stone-500">
                  {new Date(m.createdAt).toLocaleString("uz-UZ")}
                  {m.note ? ` · ${m.note}` : ""}
                  {m.orderId ? ` · #${m.orderId.slice(-8)}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-bold ${
                    m.delta >= 0 ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {m.delta >= 0 ? "+" : ""}
                  {m.delta}
                </p>
                <p className="text-xs text-stone-400">
                  qoldiq: {m.balanceAfter}
                </p>
              </div>
            </li>
          ))}
          {movements.length === 0 && (
            <li className="py-6 text-center text-sm text-stone-500">
              Hali harakat yo‘q.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
