"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

type ShopCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
};

type ShopProduct = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  listPrice: number;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  featured: boolean;
  category: { id: string; name: string } | null;
  discount: { id: string; name: string; label: string } | null;
};

type CartLine = { productId: string; qty: number };

type CartMeta = {
  name: string;
  price: number;
  listPrice: number;
  imageUrl: string | null;
};

type HistoryOrder = {
  id: string;
  status: "NEW" | "CONFIRMED" | "CANCELLED" | "DONE";
  total: number;
  createdAt: string;
  customerNote: string | null;
  items: Array<{
    id: string;
    productName: string;
    unitPrice: number;
    qty: number;
  }>;
};

const CART_KEY = "nookline:shop-cart";
const META_KEY = "nookline:shop-cart-meta";
const PHONE_KEY = "nookline:shop-phone";
const NAME_KEY = "nookline:shop-name";
const PAGE_SIZE = 8;

const STATUS_UZ: Record<HistoryOrder["status"], string> = {
  NEW: "Yangi",
  CONFIRMED: "Tasdiqlangan",
  CANCELLED: "Bekor qilingan",
  DONE: "Bajarilgan",
};

const fieldClass =
  "w-full rounded-xl border-2 border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/25";

function loadCart(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed)
      ? parsed.filter((x) => x.productId && x.qty > 0)
      : [];
  } catch {
    return [];
  }
}

function loadMeta(): Record<string, CartMeta> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, CartMeta>;
  } catch {
    return {};
  }
}

function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current]);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  return [...pages].sort((a, b) => a - b);
}

export function CustomerShop() {
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartMeta, setCartMeta] = useState<Record<string, CartMeta>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [doneId, setDoneId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [historyPhone, setHistoryPhone] = useState("");
  const [historyOrders, setHistoryOrders] = useState<HistoryOrder[] | null>(
    null,
  );

  useEffect(() => {
    setCart(loadCart());
    setCartMeta(loadMeta());
    try {
      const p = localStorage.getItem(PHONE_KEY) ?? "";
      const n = localStorage.getItem(NAME_KEY) ?? "";
      if (p) {
        setPhone(p);
        setHistoryPhone(p);
      }
      if (n) setName(n);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(META_KEY, JSON.stringify(cartMeta));
  }, [cartMeta]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/shop/categories");
        const data = (await res.json()) as { categories?: ShopCategory[] };
        setCategories(data.categories ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
      });
      if (categoryId) qs.set("categoryId", categoryId);
      const res = await fetch(`/api/shop/products?${qs}`);
      const data = (await res.json()) as {
        products?: ShopProduct[];
        totalPages?: number;
        total?: number;
      };
      const list = data.products ?? [];
      setProducts(list);
      setTotalPages(Math.max(1, data.totalPages ?? 1));
      setTotal(data.total ?? 0);
      setCartMeta((prev) => {
        const next = { ...prev };
        for (const p of list) {
          next[p.id] = {
            name: p.name,
            price: p.price,
            listPrice: p.listPrice,
            imageUrl: p.imageUrl,
          };
        }
        return next;
      });
    } catch {
      setError("Katalog yuklanmadi");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, categoryId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cart.reduce((s, l) => {
    const m = cartMeta[l.productId];
    return s + (m ? m.price * l.qty : 0);
  }, 0);
  const cartListTotal = cart.reduce((s, l) => {
    const m = cartMeta[l.productId];
    return s + (m ? m.listPrice * l.qty : 0);
  }, 0);

  const pages = useMemo(
    () => pageWindow(page, totalPages),
    [page, totalPages],
  );

  const add = useCallback((p: ShopProduct) => {
    setCartMeta((prev) => ({
      ...prev,
      [p.id]: {
        name: p.name,
        price: p.price,
        listPrice: p.listPrice,
        imageUrl: p.imageUrl,
      },
    }));
    setCart((prev) => {
      const existing = prev.find((x) => x.productId === p.id);
      if (existing) {
        return prev.map((x) =>
          x.productId === p.id ? { ...x, qty: Math.min(99, x.qty + 1) } : x,
        );
      }
      return [...prev, { productId: p.id, qty: 1 }];
    });
    setCartOpen(true);
    setDoneId("");
    setError("");
  }, []);

  const setQty = (productId: string, qty: number) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((x) => x.productId !== productId);
      return prev.map((x) =>
        x.productId === productId ? { ...x, qty: Math.min(99, qty) } : x,
      );
    });
  };

  function selectCategory(id: string) {
    setCategoryId(id);
    setPage(1);
  }

  async function loadHistory(phoneValue: string) {
    setHistoryBusy(true);
    setHistoryError("");
    try {
      const res = await fetch(
        `/api/shop/orders/history?phone=${encodeURIComponent(phoneValue.trim())}`,
      );
      const data = (await res.json()) as {
        orders?: HistoryOrder[];
        error?: string;
      };
      if (!res.ok) {
        setHistoryOrders([]);
        setHistoryError(data.error || "Tarix topilmadi");
        return;
      }
      setHistoryOrders(data.orders ?? []);
      try {
        localStorage.setItem(PHONE_KEY, phoneValue.trim());
      } catch {
        /* ignore */
      }
    } catch {
      setHistoryError("Ulanish xatosi");
      setHistoryOrders([]);
    } finally {
      setHistoryBusy(false);
    }
  }

  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/shop/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          customerNote: note || null,
          promoCode: promoCode.trim() || null,
          items: cart,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        order?: { id: string };
      };
      if (!res.ok || !data.order) {
        setError(data.error || "Buyurtma yuborilmadi");
        return;
      }
      setDoneId(data.order.id);
      setCart([]);
      setNote("");
      setPromoCode("");
      setHistoryPhone(phone);
      try {
        localStorage.setItem(PHONE_KEY, phone.trim());
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* ignore */
      }
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-dvh text-stone-900"
      style={{
        colorScheme: "light",
        background:
          "linear-gradient(180deg, #e8e2d8 0%, #f3efe8 40%, #ebe6dc 100%)",
      }}
    >
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
        <header className="mb-4 rounded-2xl border border-stone-300/80 bg-white px-5 py-4 shadow-[0_8px_28px_rgba(28,25,23,0.12)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                Onlayn do‘kon
              </p>
              <h1 className="mt-1 font-serif text-3xl font-bold text-stone-900">
                Nookline Shop
              </h1>
            </div>
            <button
              type="button"
              onClick={() => {
                setHistoryOpen(true);
                setHistoryError("");
                if (historyPhone.trim().length >= 7) {
                  void loadHistory(historyPhone);
                } else {
                  setHistoryOrders(null);
                }
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border-2 border-stone-300 bg-stone-50 px-3 py-2 text-xs font-bold text-stone-800 shadow-sm hover:bg-white"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Tarixim
            </button>
          </div>
          <p className="mt-1.5 text-sm font-medium text-stone-600">
            Bo‘lim tanlang, sahifalar orqali ko‘ring, chegirmali narxlar
            avtomatik qo‘llanadi.
          </p>
        </header>

        {categories.length > 0 && (
          <div className="mb-4 rounded-2xl border border-stone-300 bg-white p-3 shadow-md">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-stone-500">
              Bo‘limlar
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => selectCategory("")}
                className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold shadow-sm transition ${
                  !categoryId
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-stone-300 bg-stone-50 text-stone-700"
                }`}
              >
                Hammasi
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => selectCategory(c.id)}
                  className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold shadow-sm transition ${
                    categoryId === c.id
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-stone-300 bg-stone-50 text-stone-700"
                  }`}
                >
                  {c.name}
                  <span className="ml-1 opacity-70">({c.productCount})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <p className="flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-medium text-stone-700 shadow-md">
            <Loader2 className="h-4 w-4 animate-spin" /> Yuklanmoqda…
          </p>
        )}

        {!loading && products.length === 0 && (
          <p className="rounded-2xl border border-stone-300 bg-white px-4 py-8 text-center text-sm font-medium text-stone-600 shadow-md">
            Bu bo‘limda mahsulot yo‘q.
          </p>
        )}

        {error && !cartOpen && (
          <p className="mb-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 shadow-sm">
            {error}
          </p>
        )}

        <ul className="space-y-3.5">
          {products.map((p) => (
            <li
              key={p.id}
              className="overflow-hidden rounded-2xl border border-stone-300 bg-white shadow-[0_10px_30px_rgba(28,25,23,0.12)]"
            >
              <div className="flex gap-3 p-3.5">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 shadow-inner">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-stone-400">
                      <ShoppingBag className="h-8 w-8" />
                    </div>
                  )}
                  {p.discount && (
                    <span className="absolute left-1 top-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                      {p.discount.label}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-bold text-stone-900">
                        {p.name}
                      </p>
                      {p.category && (
                        <p className="text-xs font-medium text-stone-500">
                          {p.category.name}
                        </p>
                      )}
                    </div>
                    {p.featured && (
                      <span className="rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 shadow-sm">
                        Tavsiya
                      </span>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-stone-600">
                      {p.description}
                    </p>
                  )}
                  <div className="mt-2.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-base font-extrabold text-emerald-800">
                        {formatPrice(p.price)}
                      </p>
                      {p.compareAtPrice != null &&
                        p.compareAtPrice > p.price && (
                          <p className="text-xs font-medium text-stone-400 line-through">
                            {formatPrice(p.compareAtPrice)}
                          </p>
                        )}
                    </div>
                    <button
                      type="button"
                      disabled={p.stock <= 0}
                      onClick={() => add(p)}
                      className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(5,150,105,0.35)] disabled:bg-stone-300 disabled:shadow-none"
                    >
                      {p.stock <= 0 ? "Tugagan" : "Sotib olish"}
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!loading && total > 0 && (
          <div className="mt-5 rounded-2xl border border-stone-300 bg-white px-3 py-3 shadow-md">
            <p className="mb-2 text-center text-xs font-medium text-stone-500">
              {total} ta mahsulot · sahifa {page}/{totalPages}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <button
                type="button"
                aria-label="Oldingi sahifa"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="grid h-10 w-10 place-items-center rounded-xl border-2 border-stone-300 bg-stone-50 text-stone-800 shadow-sm disabled:opacity-35"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.25} />
              </button>

              {pages.map((n, idx) => {
                const prev = pages[idx - 1];
                const gap = prev != null && n - prev > 1;
                return (
                  <span key={n} className="contents">
                    {gap && (
                      <span className="px-1 text-sm font-bold text-stone-400">
                        …
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setPage(n)}
                      className={`grid h-10 min-w-10 place-items-center rounded-xl border-2 px-2 text-sm font-bold shadow-sm transition ${
                        n === page
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : "border-stone-300 bg-white text-stone-800 hover:bg-stone-50"
                      }`}
                    >
                      {n}
                    </button>
                  </span>
                );
              })}

              <button
                type="button"
                aria-label="Keyingi sahifa"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="grid h-10 w-10 place-items-center rounded-xl border-2 border-stone-300 bg-stone-50 text-stone-800 shadow-sm disabled:opacity-35"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
              </button>
            </div>
          </div>
        )}
      </div>

      {cartCount > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-stone-700 bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(0,0,0,0.4)]"
        >
          <ShoppingBag className="h-4 w-4" />
          Savat · {cartCount} · {formatPrice(cartTotal)}
        </button>
      )}

      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-300 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="text-lg font-bold text-stone-900">
                Buyurtma tarixi
              </h2>
              <button
                type="button"
                onClick={() => setHistoryOpen(false)}
                className="rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-stone-600 shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void loadHistory(historyPhone);
              }}
            >
              <input
                required
                placeholder="Telefon (+998…)"
                value={historyPhone}
                onChange={(e) => setHistoryPhone(e.target.value)}
                className={fieldClass}
              />
              <button
                type="submit"
                disabled={historyBusy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {historyBusy && <Loader2 className="h-4 w-4 animate-spin" />}
                Ko‘rish
              </button>
            </form>
            {historyError && (
              <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                {historyError}
              </p>
            )}
            {historyOrders && (
              <ul className="mt-4 space-y-3">
                {historyOrders.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-stone-300 bg-stone-50 py-6 text-center text-sm text-stone-600">
                    Buyurtma topilmadi.
                  </li>
                ) : (
                  historyOrders.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-xl border border-stone-300 bg-stone-50 p-3"
                    >
                      <div className="flex justify-between gap-2">
                        <p className="text-xs text-stone-500">
                          {new Date(o.createdAt).toLocaleString("uz-UZ")}
                        </p>
                        <span className="text-[10px] font-bold uppercase">
                          {STATUS_UZ[o.status]}
                        </span>
                      </div>
                      <ul className="mt-2 text-sm text-stone-700">
                        {o.items.map((it) => (
                          <li key={it.id}>
                            {it.productName} × {it.qty}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-right text-sm font-extrabold text-emerald-800">
                        {formatPrice(o.total)}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 backdrop-blur-[2px] sm:items-center">
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-stone-300 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
            <div className="mb-4 flex items-center justify-between border-b border-stone-200 pb-3">
              <h2 className="text-lg font-bold text-stone-900">Savat</h2>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-stone-600 shadow-sm"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {doneId ? (
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                <p className="font-bold text-emerald-800">
                  Buyurtma qabul qilindi
                </p>
                <p className="text-sm text-stone-700">
                  Kod:{" "}
                  <span className="font-mono font-bold">
                    {doneId.slice(-8)}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDoneId("");
                    setCartOpen(false);
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Yopish
                </button>
              </div>
            ) : cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-stone-500">
                Savat bo‘sh
              </p>
            ) : (
              <form onSubmit={(e) => void checkout(e)} className="space-y-4">
                <ul className="space-y-2 rounded-xl border border-stone-300 bg-stone-50 p-2">
                  {cart.map((line) => {
                    const m = cartMeta[line.productId];
                    if (!m) return null;
                    return (
                      <li
                        key={line.productId}
                        className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {m.name}
                          </p>
                          <p className="text-xs font-semibold text-emerald-800">
                            {formatPrice(m.price * line.qty)}
                            {m.listPrice > m.price && (
                              <span className="ml-1 text-stone-400 line-through">
                                {formatPrice(m.listPrice * line.qty)}
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.qty - 1)}
                            className="rounded-lg border border-stone-300 p-1.5"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-bold">
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, line.qty + 1)}
                            className="rounded-lg border border-stone-300 p-1.5"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setQty(line.productId, 0)}
                            className="ml-1 p-1.5 text-stone-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="rounded-xl border border-stone-300 bg-stone-100 px-3 py-2.5 text-right text-sm font-extrabold">
                  {cartListTotal > cartTotal && (
                    <p className="text-xs font-medium text-stone-400 line-through">
                      {formatPrice(cartListTotal)}
                    </p>
                  )}
                  Jami: {formatPrice(cartTotal)}
                </div>

                <div className="space-y-2.5 rounded-xl border border-stone-300 bg-stone-50 p-3">
                  <input
                    required
                    placeholder="Ismingiz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={fieldClass}
                  />
                  <input
                    required
                    placeholder="Telefon (+998…)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={fieldClass}
                  />
                  <input
                    placeholder="Promo kod (ixtiyoriy)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className={`${fieldClass} uppercase`}
                  />
                  <textarea
                    placeholder="Izoh (ixtiyoriy)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className={fieldClass}
                  />
                </div>

                {error && (
                  <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                  Buyurtmani yuborish
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
