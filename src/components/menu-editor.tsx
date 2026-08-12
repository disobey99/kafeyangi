"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  FolderPlus,
  ImageIcon,
  Library,
  Pencil,
  Plus,
  Tag,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { pickLocalizedName, type MenuLocale } from "@/lib/menu-i18n";
import { MENU_FOOD_TAGS, type MenuFoodTagId } from "@/lib/menu-food-tags";
import { MenuLocaleSwitcher } from "@/components/menu-locale-switcher";
import { ProductModifiersEditor } from "@/components/product-modifiers-editor";
import { ModifierHelpHint } from "@/components/modifier-help-hint";
import { MenuTemplatePicker } from "@/components/menu-template-picker";
import { MenuFoodVisual } from "@/components/menu-food-visual";

type Product = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  description: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  price: number;
  imageUrl: string | null;
  menuTag?: string | null;
  prepStationId?: string | null;
  prepStation?: { id: string; name: string } | null;
  isAvailable: boolean;
  trackStock?: boolean;
  stockQty?: number | null;
};

type Category = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  products: Product[];
};

type PrepStation = {
  id: string;
  name: string;
  isDefault: boolean;
};

export function MenuEditor({
  cafeId,
  categories: initial,
  stations = [],
}: {
  cafeId: string;
  categories: Category[];
  stations?: PrepStation[];
}) {
  const router = useRouter();
  const [newCategory, setNewCategory] = useState("");
  const [addingProductTo, setAddingProductTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [modifiersProduct, setModifiersProduct] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [previewLocale, setPreviewLocale] = useState<MenuLocale>("uz");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const productCount = initial.reduce((n, c) => n + c.products.length, 0);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    setCategoryLoading(true);
    setError("");
    const res = await fetch(`/api/cafes/${cafeId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategory.trim() }),
    });
    setCategoryLoading(false);
    if (!res.ok) {
      setError("Kategoriya qo'shilmadi");
      return;
    }
    setNewCategory("");
    router.refresh();
  }

  async function deleteCategory(id: string) {
    if (!confirm("Kategoriyani o'chirish?")) return;
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Xatolik");
      return;
    }
    router.refresh();
  }

  function openAddForm(categoryId: string) {
    setEditingId(null);
    setEditingCategoryId(null);
    setAddingProductTo((prev) => (prev === categoryId ? null : categoryId));
  }

  function openEditForm(productId: string) {
    setAddingProductTo(null);
    setEditingCategoryId(null);
    setEditingId(productId);
  }

  function openEditCategory(categoryId: string) {
    setAddingProductTo(null);
    setEditingId(null);
    setEditingCategoryId(categoryId);
  }

  function closeForms() {
    setAddingProductTo(null);
    setEditingId(null);
    setEditingCategoryId(null);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--dp-accent)]">
            Menyu
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--dp-text)]">
            Taomlar va narxlar
          </h1>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            {initial.length} kategoriya · {productCount} ta mahsulot
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="btn btn-secondary gap-2"
          >
            <Library className="h-4 w-4" />
            Tayyor bazadan
          </button>
          <div className="rounded-xl border border-[var(--dp-border)] bg-[var(--dp-input-bg)] px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--dp-muted)]">
            Mijoz menyusi tili (ko&apos;rish)
          </p>
          <MenuLocaleSwitcher
            locale={previewLocale}
            onChange={setPreviewLocale}
            variant="light"
            showLabel
          />
        </div>
        </div>
      </header>

      <form
        onSubmit={addCategory}
        className="dp-card flex flex-wrap items-end gap-3 rounded-2xl p-4"
      >
        <div className="min-w-[200px] flex-1">
          <label className="label" htmlFor="new-category">
            Yangi kategoriya
          </label>
          <input
            id="new-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Masalan: Ichimliklar"
            className="input"
            disabled={categoryLoading}
          />
        </div>
        <button
          type="submit"
          disabled={categoryLoading || !newCategory.trim()}
          className="btn btn-primary gap-2"
        >
          <FolderPlus className="h-4 w-4" />
          {categoryLoading ? "..." : "Qo'shish"}
        </button>
      </form>

      {error && (
        <p className="rounded-xl px-4 py-2 text-sm text-red-500" style={{ background: "rgba(239,68,68,0.1)" }}>
          {error}
        </p>
      )}

      {initial.length === 0 ? (
        <div className="dp-card rounded-2xl p-12 text-center">
          <UtensilsCrossed className="mx-auto h-10 w-10 text-[var(--dp-muted)] opacity-50" />
          <p className="mt-3 font-medium text-[var(--dp-muted)]">Hali kategoriya yo&apos;q</p>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            Yuqorida birinchi kategoriyani qo&apos;shing
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {initial.map((cat) => (
            <section key={cat.id} className="dp-card overflow-hidden rounded-2xl">
              <div
                className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4"
                style={{ borderColor: "var(--dp-border-subtle)", background: "var(--dp-card-header)" }}
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Tag className="h-4 w-4 shrink-0 text-[var(--dp-accent)]" />
                  {editingCategoryId === cat.id ? (
                    <CategoryNameForm
                      category={cat}
                      onDone={() => {
                        closeForms();
                        router.refresh();
                      }}
                      onCancel={closeForms}
                    />
                  ) : (
                    <>
                      <h2 className="text-lg font-bold text-[var(--dp-text)]">
                        {pickLocalizedName(cat, previewLocale)}
                      </h2>
                      <span className="text-xs text-[var(--dp-muted)]">
                        {cat.products.length} ta
                      </span>
                    </>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingCategoryId !== cat.id && (
                    <button
                      type="button"
                      onClick={() => openEditCategory(cat.id)}
                      className="btn btn-secondary gap-1.5 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Tahrirlash
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openAddForm(cat.id)}
                    className={`btn gap-1.5 text-xs ${
                      addingProductTo === cat.id ? "btn-primary" : "btn-secondary"
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Taom qo&apos;shish
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteCategory(cat.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    O&apos;chirish
                  </button>
                </div>
              </div>

              <div className="p-4">
                {addingProductTo === cat.id && (
                  <ProductForm
                    cafeId={cafeId}
                    categoryId={cat.id}
                    stations={stations}
                    onDone={() => {
                      closeForms();
                      router.refresh();
                    }}
                    onCancel={closeForms}
                  />
                )}

                <div className="space-y-2">
                  {cat.products.length === 0 && addingProductTo !== cat.id ? (
                    <p className="py-6 text-center text-sm text-[var(--dp-muted)]">
                      Bu kategoriyada taomlar yo&apos;q — &quot;Taom qo&apos;shish&quot; bosing
                    </p>
                  ) : (
                    cat.products.map((product) =>
                      editingId === product.id ? (
                        <ProductForm
                          key={product.id}
                          cafeId={cafeId}
                          categoryId={cat.id}
                          product={product}
                          stations={stations}
                          onDone={() => {
                            closeForms();
                            router.refresh();
                          }}
                          onCancel={closeForms}
                        />
                      ) : (
                        <ProductRow
                          key={product.id}
                          product={product}
                          displayName={pickLocalizedName(product, previewLocale)}
                          stationName={
                            product.prepStation?.name ??
                            stations.find((s) => s.id === product.prepStationId)?.name ??
                            stations.find((s) => s.isDefault)?.name
                          }
                          onEdit={() => openEditForm(product.id)}
                          onModifiers={() =>
                            setModifiersProduct({ id: product.id, name: product.name })
                          }
                          onToggle={async () => {
                            await fetch(`/api/products/${product.id}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                isAvailable: !product.isAvailable,
                              }),
                            });
                            router.refresh();
                          }}
                          onDelete={async () => {
                            if (!confirm("Taomni o'chirish?")) return;
                            await fetch(`/api/products/${product.id}`, {
                              method: "DELETE",
                            });
                            router.refresh();
                          }}
                        />
                      )
                    )
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
      {modifiersProduct && (
        <ProductModifiersEditor
          productId={modifiersProduct.id}
          productName={modifiersProduct.name}
          onClose={() => {
            setModifiersProduct(null);
            router.refresh();
          }}
        />
      )}
      {templatePickerOpen && (
        <MenuTemplatePicker
          cafeId={cafeId}
          categories={initial.map((c) => ({ id: c.id, name: c.name }))}
          onClose={() => setTemplatePickerOpen(false)}
        />
      )}
    </div>
  );
}

function CategoryNameForm({
  category,
  onDone,
  onCancel,
}: {
  category: Category;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: category.name,
    nameRu: category.nameRu ?? "",
    nameEn: category.nameEn ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = form.name.trim();
    if (!trimmed) {
      setError("Kategoriya nomi kerak");
      return;
    }
    if (
      trimmed === category.name &&
      (form.nameRu.trim() || "") === (category.nameRu ?? "") &&
      (form.nameEn.trim() || "") === (category.nameEn ?? "")
    ) {
      onCancel();
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          nameRu: form.nameRu.trim() || null,
          nameEn: form.nameEn.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      onDone();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="O'zbekcha nom"
          className="input min-w-[140px] flex-1 py-1.5 text-sm"
          autoFocus
          disabled={loading}
          aria-label="Kategoriya nomi"
        />
        <input
          value={form.nameRu}
          onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
          placeholder="Ruscha"
          className="input min-w-[120px] flex-1 py-1.5 text-sm"
          disabled={loading}
        />
        <input
          value={form.nameEn}
          onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
          placeholder="English"
          className="input min-w-[120px] flex-1 py-1.5 text-sm"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !form.name.trim()} className="btn btn-primary px-3 py-1.5 text-xs">
          {loading ? "..." : "Saqlash"}
        </button>
        <button type="button" onClick={onCancel} disabled={loading} className="btn btn-secondary px-3 py-1.5 text-xs">
          Bekor
        </button>
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </form>
  );
}

function ProductRow({
  product,
  displayName,
  stationName,
  onEdit,
  onModifiers,
  onToggle,
  onDelete,
}: {
  product: Product;
  displayName: string;
  stationName?: string;
  onEdit: () => void;
  onModifiers: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition hover:border-[var(--dp-accent)]"
      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded-xl object-cover"
          />
        ) : product.menuTag ? (
          <MenuFoodVisual menuTag={product.menuTag} name={displayName} className="h-14 w-14" />
        ) : (
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--dp-accent-soft)", color: "var(--dp-accent)" }}
          >
            <UtensilsCrossed className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-[var(--dp-text)]">{displayName}</p>
          {displayName !== product.name && (
            <p className="text-xs text-[var(--dp-muted)]">Asosiy: {product.name}</p>
          )}
          {product.description && (
            <p className="mt-0.5 line-clamp-1 text-sm text-[var(--dp-muted)]">
              {product.description}
            </p>
          )}
          <p className="mt-1 text-sm font-bold text-[var(--dp-accent)]">
            {formatPrice(product.price)}
          </p>
          {stationName && (
            <p className="mt-0.5 text-xs text-[var(--dp-muted)]">Stansiya: {stationName}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            product.isAvailable
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-red-500/15 text-red-500"
          }`}
        >
          <Check className="h-3 w-3" />
          {product.isAvailable ? "Mavjud" : "Mavjud emas"}
        </button>
        <div className="inline-flex items-center rounded-xl border border-[var(--dp-border)] bg-[var(--dp-input-bg)]">
          <button
            type="button"
            onClick={onModifiers}
            className="btn btn-secondary gap-1.5 rounded-r-none border-0 px-3 py-1.5 text-xs shadow-none"
          >
            <Tag className="h-3.5 w-3.5" />
            Variantlar
          </button>
          <ModifierHelpHint compact />
        </div>
        <button type="button" onClick={onEdit} className="btn btn-secondary gap-1.5 px-3 py-1.5 text-xs">
          <Pencil className="h-3.5 w-3.5" />
          Tahrirlash
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-red-500 transition hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function ProductForm({
  cafeId,
  categoryId,
  product,
  stations = [],
  onDone,
  onCancel,
}: {
  cafeId: string;
  categoryId: string;
  product?: Product;
  stations?: PrepStation[];
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const defaultStationId = stations.find((s) => s.isDefault)?.id ?? stations[0]?.id ?? "";
  const [form, setForm] = useState({
    name: product?.name ?? "",
    nameRu: product?.nameRu ?? "",
    nameEn: product?.nameEn ?? "",
    description: product?.description ?? "",
    descriptionRu: product?.descriptionRu ?? "",
    descriptionEn: product?.descriptionEn ?? "",
    priceSom: product ? String(product.price / 100) : "",
    imageUrl: product?.imageUrl ?? "",
    menuTag: (product?.menuTag as MenuFoodTagId | null) ?? null,
    prepStationId: product?.prepStationId ?? defaultStationId,
    trackStock: product?.trackStock ?? false,
    stockQty: product?.stockQty != null ? String(product.stockQty) : "",
  });

  async function uploadProductImage(file: File) {
    setUploading(true);
    setError("");
    try {
      const { uploadCafeImage } = await import("@/lib/upload-client");
      const result = await uploadCafeImage(cafeId, file, form.imageUrl || null);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setForm((f) => ({ ...f, imageUrl: result.url }));
    } catch {
      setError("Rasm yuklashda xatolik");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const priceSom = parseInt(String(form.priceSom).replace(/\s/g, ""), 10);
      const payload = {
        name: form.name.trim(),
        nameRu: form.nameRu.trim() || null,
        nameEn: form.nameEn.trim() || null,
        description: form.description.trim() || null,
        descriptionRu: form.descriptionRu.trim() || null,
        descriptionEn: form.descriptionEn.trim() || null,
        priceSom,
        imageUrl: form.imageUrl.trim() || null,
        menuTag: form.menuTag,
        prepStationId: form.prepStationId || null,
        trackStock: form.trackStock,
        stockQty: form.trackStock ? parseInt(form.stockQty || "0", 10) : null,
      };

      if (!payload.name) {
        setError("Taom nomi kerak");
        return;
      }
      if (!Number.isFinite(priceSom) || priceSom < 100) {
        setError("Narx kamida 100 so'm bo'lishi kerak");
        return;
      }

      const res = product
        ? await fetch(`/api/products/${product.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/cafes/${cafeId}/products`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, categoryId }),
          });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      onDone();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 rounded-xl border p-4"
      style={{
        borderColor: "var(--dp-accent)",
        background: "var(--dp-accent-soft)",
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--dp-text)]">
          {product ? "Taomni tahrirlash" : "Yangi taom"}
        </p>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1 text-[var(--dp-muted)] transition hover:bg-[var(--dp-input-bg)] hover:text-[var(--dp-text)]"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`name-${categoryId}-${product?.id ?? "new"}`}>
            Taom nomi *
          </label>
          <input
            id={`name-${categoryId}-${product?.id ?? "new"}`}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Masalan: Lag'mon"
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label className="label" htmlFor={`price-${categoryId}-${product?.id ?? "new"}`}>
            Narx (so&apos;m) *
          </label>
          <input
            id={`price-${categoryId}-${product?.id ?? "new"}`}
            required
            type="number"
            min={100}
            step={1}
            inputMode="numeric"
            value={form.priceSom}
            onChange={(e) => setForm({ ...form, priceSom: e.target.value })}
            placeholder="28000"
            className="input"
          />
        </div>
        {stations.length > 0 ? (
          <div className="sm:col-span-2">
            <label
              className="label"
              htmlFor={`station-${categoryId}-${product?.id ?? "new"}`}
            >
              Tayyorlash stansiyasi *
            </label>
            <select
              id={`station-${categoryId}-${product?.id ?? "new"}`}
              value={form.prepStationId}
              onChange={(e) => setForm({ ...form, prepStationId: e.target.value })}
              className="input border-[var(--dp-accent)] font-semibold"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isDefault ? " (asosiy)" : ""}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--dp-muted)]">
              Bu taom qaysi joyga chek chiqadi (Oshxona, Kabob, Bar…)
            </p>
          </div>
        ) : null}
        <div>
          <label className="label">Nom (Rus)</label>
          <input value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Nom (Ingliz)</label>
          <input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`tag-${categoryId}-${product?.id ?? "new"}`}>
            Taom turi (filter)
          </label>
          <select
            id={`tag-${categoryId}-${product?.id ?? "new"}`}
            value={form.menuTag ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                menuTag: (e.target.value || null) as MenuFoodTagId | null,
              })
            }
            className="input"
          >
            <option value="">Tanlanmagan</option>
            {MENU_FOOD_TAGS.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.emoji} {tag.labelUz}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor={`desc-${categoryId}-${product?.id ?? "new"}`}>
            Tavsif
          </label>
          <textarea
            id={`desc-${categoryId}-${product?.id ?? "new"}`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Qisqa tavsif (ixtiyoriy)"
            rows={2}
            className="input resize-none"
          />
        </div>
        <div className="sm:col-span-2 flex flex-wrap items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.trackStock}
              onChange={(e) => setForm({ ...form, trackStock: e.target.checked })}
            />
            Qoldiqni kuzatish
          </label>
          {form.trackStock && (
            <div>
              <label className="label">Qoldiq (dona)</label>
              <input
                type="number"
                min={0}
                value={form.stockQty}
                onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                className="input w-32"
              />
            </div>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="label">
            <span className="inline-flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" />
              Taom rasmi (1 ta)
            </span>
          </label>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card-header)]">
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-[var(--dp-muted)]" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn btn-secondary cursor-pointer px-3 py-2 text-sm">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploading || loading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadProductImage(file);
                    e.target.value = "";
                  }}
                />
                {uploading ? "Yuklanmoqda…" : "Rasm yuklash"}
              </label>
              {form.imageUrl && (
                <button
                  type="button"
                  disabled={uploading || loading}
                  onClick={() => setForm({ ...form, imageUrl: "" })}
                  className="rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm font-semibold text-[var(--dp-muted)] hover:bg-[var(--dp-card-header)]"
                >
                  Olib tashlash
                </button>
              )}
            </div>
          </div>
          <p className="mt-1.5 text-xs text-[var(--dp-muted)]">
            Yangi rasm eski faylni avtomatik o&apos;chiradi. Tavsiya: kvadrat, max 5 MB.
          </p>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="yoki URL: https://... /uploads/..."
            className="input mt-2"
          />
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="submit" disabled={loading} className="btn btn-primary gap-2">
          {loading ? "Saqlanmoqda..." : product ? "Saqlash" : "Qo'shish"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Bekor qilish
          </button>
        )}
      </div>
    </form>
  );
}
