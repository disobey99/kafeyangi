"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Check,
  ImagePlus,
  Loader2,
  Package,
  Pencil,
  Percent,
  Plus,
  Star,
  Tags,
  Trash2,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { uploadPlatformImage } from "@/lib/upload-client";

type Tab = "products" | "categories" | "discounts";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  sku: string | null;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  featured: boolean;
  categoryId: string | null;
  category: { id: string; name: string } | null;
};

type Discount = {
  id: string;
  name: string;
  code: string | null;
  type: "PERCENT" | "FIXED";
  value: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  products: Array<{ product: { id: string; name: string } }>;
};

export function PlatformShoppingAdmin({
  initialTab = "products",
}: {
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [catForm, setCatForm] = useState({
    id: "" as string | "",
    name: "",
    description: "",
    sortOrder: 0,
    isActive: true,
  });
  const [prodForm, setProdForm] = useState({
    id: "" as string | "",
    name: "",
    description: "",
    categoryId: "",
    priceSom: "",
    compareAtSom: "",
    stock: "0",
    sku: "",
    status: "DRAFT" as Product["status"],
    featured: false,
    imageUrl: "",
  });
  const [discForm, setDiscForm] = useState({
    id: "" as string | "",
    name: "",
    code: "",
    type: "PERCENT" as Discount["type"],
    value: "",
    isActive: true,
    productIds: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [c, p, d] = await Promise.all([
        fetch("/api/platform/shopping/categories").then((r) => r.json()),
        fetch("/api/platform/shopping/products").then((r) => r.json()),
        fetch("/api/platform/shopping/discounts").then((r) => r.json()),
      ]);
      setCategories(c.categories ?? []);
      setProducts(p.products ?? []);
      setDiscounts(d.discounts ?? []);
    } catch {
      setError("Ma’lumot yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === "ACTIVE"),
    [products],
  );

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: catForm.name,
        description: catForm.description || null,
        sortOrder: Number(catForm.sortOrder) || 0,
        isActive: catForm.isActive,
      };
      const res = await fetch(
        catForm.id
          ? `/api/platform/shopping/categories/${catForm.id}`
          : "/api/platform/shopping/categories",
        {
          method: catForm.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xato");
      setCatForm({
        id: "",
        name: "",
        description: "",
        sortOrder: 0,
        isActive: true,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xato");
    } finally {
      setBusy(false);
    }
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: prodForm.name,
        description: prodForm.description || null,
        categoryId: prodForm.categoryId || null,
        priceSom: Number(prodForm.priceSom),
        compareAtSom: prodForm.compareAtSom
          ? Number(prodForm.compareAtSom)
          : null,
        stock: Number(prodForm.stock) || 0,
        sku: prodForm.sku || null,
        status: prodForm.status,
        featured: prodForm.featured,
        imageUrl: prodForm.imageUrl || null,
      };
      const res = await fetch(
        prodForm.id
          ? `/api/platform/shopping/products/${prodForm.id}`
          : "/api/platform/shopping/products",
        {
          method: prodForm.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xato");
      setProdForm({
        id: "",
        name: "",
        description: "",
        categoryId: "",
        priceSom: "",
        compareAtSom: "",
        stock: "0",
        sku: "",
        status: "DRAFT",
        featured: false,
        imageUrl: "",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xato");
    } finally {
      setBusy(false);
    }
  }

  async function saveDiscount(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: discForm.name,
        code: discForm.code || null,
        type: discForm.type,
        value: Number(discForm.value),
        isActive: discForm.isActive,
        productIds: discForm.productIds,
      };
      const res = await fetch(
        discForm.id
          ? `/api/platform/shopping/discounts/${discForm.id}`
          : "/api/platform/shopping/discounts",
        {
          method: discForm.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xato");
      setDiscForm({
        id: "",
        name: "",
        code: "",
        type: "PERCENT",
        value: "",
        isActive: true,
        productIds: [],
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xato");
    } finally {
      setBusy(false);
    }
  }

  async function remove(kind: Tab, id: string) {
    if (!window.confirm("O‘chirasizmi?")) return;
    setBusy(true);
    try {
      const path =
        kind === "products"
          ? `/api/platform/shopping/products/${id}`
          : kind === "categories"
            ? `/api/platform/shopping/categories/${id}`
            : `/api/platform/shopping/discounts/${id}`;
      const res = await fetch(path, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "O‘chirilmadi");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xato");
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: typeof Package }> = [
    { id: "products", label: "Mahsulotlar", icon: Package },
    { id: "categories", label: "Kategoriyalar", icon: Tags },
    { id: "discounts", label: "Chegirmalar", icon: Percent },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                tab === t.id
                  ? "bg-violet-600 text-white"
                  : "bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-stone-500">Yuklanmoqda…</p>}

      {!loading && tab === "categories" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <form
            onSubmit={(e) => void saveCategory(e)}
            className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 lg:col-span-2"
          >
            <h2 className="font-bold text-stone-900">
              {catForm.id ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}
            </h2>
            <input
              required
              placeholder="Nomi"
              value={catForm.name}
              onChange={(e) => setCatForm((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Tavsif"
              value={catForm.description}
              onChange={(e) =>
                setCatForm((s) => ({ ...s, description: e.target.value }))
              }
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={catForm.isActive}
                onChange={(e) =>
                  setCatForm((s) => ({ ...s, isActive: e.target.checked }))
                }
              />
              Faol
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {catForm.id ? "Saqlash" : "Qo‘shish"}
              </button>
              {catForm.id && (
                <button
                  type="button"
                  onClick={() =>
                    setCatForm({
                      id: "",
                      name: "",
                      description: "",
                      sortOrder: 0,
                      isActive: true,
                    })
                  }
                  className="rounded-xl px-3 py-2 text-sm text-stone-500"
                >
                  Bekor
                </button>
              )}
            </div>
          </form>
          <div className="space-y-2 lg:col-span-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-100"
              >
                <div>
                  <p className="font-semibold text-stone-900">{c.name}</p>
                  <p className="text-xs text-stone-500">
                    {c._count?.products ?? 0} mahsulot · {c.isActive ? "faol" : "o‘chiq"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCatForm({
                        id: c.id,
                        name: c.name,
                        description: c.description ?? "",
                        sortOrder: c.sortOrder,
                        isActive: c.isActive,
                      })
                    }
                    className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove("categories", c.id)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <p className="text-sm text-stone-500">Hali kategoriya yo‘q.</p>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "products" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <form
            onSubmit={(e) => void saveProduct(e)}
            className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 lg:col-span-2"
          >
            <h2 className="font-bold text-stone-900">
              {prodForm.id ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}
            </h2>
            <input
              required
              placeholder="Nomi"
              value={prodForm.name}
              onChange={(e) => setProdForm((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
            <textarea
              placeholder="Tavsif"
              value={prodForm.description}
              onChange={(e) =>
                setProdForm((s) => ({ ...s, description: e.target.value }))
              }
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              rows={3}
            />
            <select
              value={prodForm.categoryId}
              onChange={(e) =>
                setProdForm((s) => ({ ...s, categoryId: e.target.value }))
              }
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              <option value="">Kategoriyasiz</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="Narx (so‘m)"
                value={prodForm.priceSom}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, priceSom: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              />
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="Eski narx"
                value={prodForm.compareAtSom}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, compareAtSom: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Ombor (dona)"
                title="Boshlang‘ich / tuzatish. To‘liq ombor: Shopping → Ombor"
                value={prodForm.stock}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, stock: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              />
              <input
                placeholder="SKU"
                value={prodForm.sku}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, sku: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              />
            </div>
            <select
              value={prodForm.status}
              onChange={(e) =>
                setProdForm((s) => ({
                  ...s,
                  status: e.target.value as Product["status"],
                }))
              }
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            >
              <option value="DRAFT">Qoralama</option>
              <option value="ACTIVE">Faol (sotuvda)</option>
              <option value="ARCHIVED">Arxiv</option>
            </select>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-stone-100 px-3 py-2 text-sm font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-stone-200 ${
                    uploadingImage || busy ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {uploadingImage ? "Yuklanmoqda…" : "Fayldan tanlash"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    disabled={uploadingImage || busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      void (async () => {
                        setUploadingImage(true);
                        setError("");
                        const result = await uploadPlatformImage(
                          file,
                          prodForm.imageUrl || null,
                        );
                        setUploadingImage(false);
                        if ("error" in result) {
                          setError(result.error);
                          return;
                        }
                        setProdForm((s) => ({ ...s, imageUrl: result.url }));
                      })();
                    }}
                  />
                </label>
                {prodForm.imageUrl && (
                  <button
                    type="button"
                    disabled={busy || uploadingImage}
                    onClick={() =>
                      setProdForm((s) => ({ ...s, imageUrl: "" }))
                    }
                    className="text-xs font-medium text-stone-500 underline"
                  >
                    Rasmni olib tashlash
                  </button>
                )}
              </div>
              {prodForm.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={prodForm.imageUrl}
                  alt=""
                  className="h-24 w-24 rounded-xl object-cover ring-1 ring-stone-200"
                />
              ) : null}
              <input
                placeholder="yoki rasm URL (https://… /uploads/…)"
                value={prodForm.imageUrl.startsWith("data:") ? "" : prodForm.imageUrl}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, imageUrl: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              />
              {prodForm.imageUrl.startsWith("data:") && (
                <p className="text-xs text-stone-500">
                  Rasm fayldan yuklandi (URL o‘rniga saqlanadi).
                </p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={prodForm.featured}
                onChange={(e) =>
                  setProdForm((s) => ({ ...s, featured: e.target.checked }))
                }
              />
              Tavsiya etilgan
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {prodForm.id ? "Saqlash" : "Qo‘shish"}
            </button>
          </form>
          <div className="space-y-2 lg:col-span-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-100"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-stone-900">{p.name}</p>
                    {p.featured && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase text-stone-500">
                      {p.status}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-violet-700">
                    {formatPrice(p.price)}
                    {p.compareAtPrice != null && p.compareAtPrice > p.price && (
                      <span className="ml-2 text-stone-400 line-through">
                        {formatPrice(p.compareAtPrice)}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-stone-500">
                    {p.category?.name ?? "Kategoriyasiz"} · ombor: {p.stock}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setProdForm({
                        id: p.id,
                        name: p.name,
                        description: p.description ?? "",
                        categoryId: p.categoryId ?? "",
                        priceSom: String(Math.floor(p.price / 100)),
                        compareAtSom:
                          p.compareAtPrice != null
                            ? String(Math.floor(p.compareAtPrice / 100))
                            : "",
                        stock: String(p.stock),
                        sku: p.sku ?? "",
                        status: p.status,
                        featured: p.featured,
                        imageUrl: p.imageUrl ?? "",
                      })
                    }
                    className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove("products", p.id)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-stone-500">Hali mahsulot yo‘q.</p>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "discounts" && (
        <div className="grid gap-6 lg:grid-cols-5">
          <form
            onSubmit={(e) => void saveDiscount(e)}
            className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-100 lg:col-span-2"
          >
            <h2 className="font-bold text-stone-900">
              {discForm.id ? "Chegirmani tahrirlash" : "Yangi chegirma"}
            </h2>
            <input
              required
              placeholder="Nomi"
              value={discForm.name}
              onChange={(e) => setDiscForm((s) => ({ ...s, name: e.target.value }))}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            />
            <input
              placeholder="Promo kod (ixtiyoriy)"
              value={discForm.code}
              onChange={(e) => setDiscForm((s) => ({ ...s, code: e.target.value }))}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm uppercase"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={discForm.type}
                onChange={(e) =>
                  setDiscForm((s) => ({
                    ...s,
                    type: e.target.value as Discount["type"],
                  }))
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              >
                <option value="PERCENT">Foiz %</option>
                <option value="FIXED">Summa (so‘m)</option>
              </select>
              <input
                required
                type="number"
                min={1}
                placeholder={discForm.type === "PERCENT" ? "Masalan 10" : "So‘m"}
                value={discForm.value}
                onChange={(e) =>
                  setDiscForm((s) => ({ ...s, value: e.target.value }))
                }
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-stone-200 p-2">
              <p className="text-xs font-semibold text-stone-500">
                Mahsulotlar (bo‘sh = hammaga). Promo kod bo‘lmasa — /shop da
                avtomatik; kod bo‘lsa — savatda kiritiladi.
              </p>
              {activeProducts.map((p) => {
                const checked = discForm.productIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 text-sm text-stone-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setDiscForm((s) => ({
                          ...s,
                          productIds: checked
                            ? s.productIds.filter((x) => x !== p.id)
                            : [...s.productIds, p.id],
                        }))
                      }
                    />
                    {p.name}
                  </label>
                );
              })}
              {activeProducts.length === 0 && (
                <p className="text-xs text-stone-400">Faol mahsulot yo‘q</p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input
                type="checkbox"
                checked={discForm.isActive}
                onChange={(e) =>
                  setDiscForm((s) => ({ ...s, isActive: e.target.checked }))
                }
              />
              Faol
            </label>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Percent className="h-4 w-4" />
              {discForm.id ? "Saqlash" : "Qo‘shish"}
            </button>
          </form>
          <div className="space-y-2 lg:col-span-3">
            {discounts.map((d) => (
              <div
                key={d.id}
                className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-100"
              >
                <div>
                  <p className="font-semibold text-stone-900">{d.name}</p>
                  <p className="text-sm text-violet-700">
                    {d.type === "PERCENT"
                      ? `${d.value}%`
                      : formatPrice(d.value)}
                    {d.code ? ` · kod: ${d.code}` : ""}
                    {!d.isActive ? " · o‘chiq" : ""}
                  </p>
                  <p className="text-xs text-stone-500">
                    {d.products.length
                      ? d.products.map((x) => x.product.name).join(", ")
                      : "Barcha mahsulotlar"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDiscForm({
                        id: d.id,
                        name: d.name,
                        code: d.code ?? "",
                        type: d.type,
                        value: String(
                          d.type === "PERCENT"
                            ? d.value
                            : Math.floor(d.value / 100),
                        ),
                        isActive: d.isActive,
                        productIds: d.products.map((x) => x.product.id),
                      })
                    }
                    className="rounded-lg p-2 text-stone-500 hover:bg-stone-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove("discounts", d.id)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {discounts.length === 0 && (
              <p className="text-sm text-stone-500">Hali chegirma yo‘q.</p>
            )}
          </div>
        </div>
      )}

      {!loading && tab === "products" && products.some((p) => p.status === "ARCHIVED") && (
        <p className="flex items-center gap-2 text-xs text-stone-400">
          <Archive className="h-3.5 w-3.5" />
          Arxivdagi mahsulotlar ro‘yxatda ko‘rinadi — kerak bo‘lsa yana faollashtiring.
        </p>
      )}
    </div>
  );
}
