"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Loader2, Phone, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type OrderStatus = "NEW" | "CONFIRMED" | "CANCELLED" | "DONE";

type ShopOrder = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerNote: string | null;
  status: OrderStatus;
  total: number;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    unitPrice: number;
    qty: number;
  }>;
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Yangi",
  CONFIRMED: "Tasdiqlangan",
  CANCELLED: "Bekor",
  DONE: "Bajarilgan",
};

const STATUS_CLASS: Record<OrderStatus, string> = {
  NEW: "bg-amber-100 text-amber-900 ring-amber-200",
  CONFIRMED: "bg-sky-100 text-sky-900 ring-sky-200",
  CANCELLED: "bg-stone-100 text-stone-600 ring-stone-200",
  DONE: "bg-emerald-100 text-emerald-900 ring-emerald-200",
};

export function PlatformShoppingOrders() {
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [newCount, setNewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/platform/shopping/orders");
      const data = (await res.json()) as {
        orders?: ShopOrder[];
        newCount?: number;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Yuklanmadi");
        return;
      }
      setOrders(data.orders ?? []);
      setNewCount(Number(data.newCount ?? 0));
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 20_000);
    return () => clearInterval(t);
  }, [load]);

  async function setStatus(id: string, status: OrderStatus) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/platform/shopping/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Status yangilanmadi");
        return;
      }
      await load();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          <ClipboardList className="h-4 w-4" />
          {newCount > 0 ? (
            <span className="font-semibold text-amber-800">
              {newCount} ta yangi buyurtma
            </span>
          ) : (
            <span>Yangi buyurtma yo‘q</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50"
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

      {loading && orders.length === 0 && (
        <p className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…
        </p>
      )}

      {!loading && orders.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-10 text-center text-sm text-stone-500">
          Hali buyurtma yo‘q. Xaridorlar{" "}
          <code className="rounded bg-stone-100 px-1">/shop</code> orqali
          buyurtma berganda shu yerda chiqadi.
        </div>
      )}

      <ul className="space-y-3">
        {orders.map((o) => (
          <li
            key={o.id}
            className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-stone-900">{o.customerName}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${STATUS_CLASS[o.status]}`}
                  >
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>
                <a
                  href={`tel:${o.customerPhone}`}
                  className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {o.customerPhone}
                </a>
                <p className="mt-1 text-xs text-stone-500">
                  {new Date(o.createdAt).toLocaleString("uz-UZ")} · #
                  {o.id.slice(-8)}
                </p>
              </div>
              <p className="text-lg font-extrabold text-emerald-800">
                {formatPrice(o.total)}
              </p>
            </div>

            <ul className="mt-3 space-y-1 rounded-xl bg-stone-50 px-3 py-2 text-sm ring-1 ring-stone-100">
              {o.items.map((it) => (
                <li
                  key={it.id}
                  className="flex justify-between gap-2 text-stone-700"
                >
                  <span>
                    {it.productName}{" "}
                    <span className="text-stone-400">× {it.qty}</span>
                  </span>
                  <span className="font-medium">
                    {formatPrice(it.unitPrice * it.qty)}
                  </span>
                </li>
              ))}
            </ul>

            {o.customerNote && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-100">
                Izoh: {o.customerNote}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["CONFIRMED", "Tasdiqlash"],
                  ["DONE", "Bajarildi"],
                  ["CANCELLED", "Bekor qilish"],
                  ["NEW", "Yangi"],
                ] as const
              ).map(([st, label]) => (
                <button
                  key={st}
                  type="button"
                  disabled={busyId === o.id || o.status === st}
                  onClick={() => void setStatus(o.id, st)}
                  className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 disabled:opacity-40"
                >
                  {busyId === o.id && o.status !== st ? "…" : label}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
