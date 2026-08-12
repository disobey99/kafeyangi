"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Gift,
  Smartphone,
  Tag,
  Megaphone,
  Plus,
  Trash2,
  Check,
  X,
  Sparkles,
  Percent,
  Pencil,
  Phone,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { NumberInput } from "@/components/ui/number-input";

type Promo = {
  id: string;
  name: string;
  type: "PERCENT" | "FIXED";
  value: number;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  label: string;
  activeNow: boolean;
  imageUrl?: string | null;
  productId?: string | null;
  slot?: number | null;
};

type Product = {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  category: {
    name: string;
  };
};

type Notice = {
  id: string;
  title: string;
  body: string;
  priority: string;
  createdAt: string;
};

type TabId = "promos" | "discounts" | "announcements" | "support";

export function AppSettingsManager({ cafeId }: { cafeId: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("promos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [supportSaving, setSupportSaving] = useState(false);

  // Promotions State
  const [promos, setPromos] = useState<Promo[]>([]);
  const [promoFormOpen, setPromoFormOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [promoForm, setPromoForm] = useState({
    name: "",
    type: "PERCENT" as "PERCENT" | "FIXED",
    value: "" as number | "",
    startTime: "",
    endTime: "",
    imageUrl: "",
    productId: "",
    slot: "" as "" | 1 | 2 | 3,
  });
  const noticeFormRef = useRef<HTMLFormElement | null>(null);

  // Discounts State
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQ] = useState("");
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [discountInput, setDiscountInput] = useState<string>("");

  // Announcements State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [editingNoticeId, setEditingNoticeId] = useState<string | null>(null);
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    body: "",
    priority: "NORMAL" as "LOW" | "NORMAL" | "HIGH",
  });

  // Load Promotions
  const loadPromos = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/promotions?channel=BANNER`);
      const data = await res.json();
      setPromos(data.promotions ?? []);
    } catch (err) {
      console.error("Promos load error:", err);
    }
  }, [cafeId]);

  // Load Products
  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/products`);
      const data = await res.json();
      setProducts(data.products ?? []);
    } catch (err) {
      console.error("Products load error:", err);
    }
  }, [cafeId]);

  // Load Announcements
  const loadNotices = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/notices?audience=CUSTOMER`);
      const data = await res.json();
      setNotices(data.notices ?? []);
    } catch (err) {
      console.error("Notices load error:", err);
    }
  }, [cafeId]);

  const loadSupport = useCallback(async () => {
    try {
      const res = await fetch(`/api/cafes/${cafeId}/app-support`);
      const data = await res.json();
      if (res.ok) setSupportPhone(data.supportPhone ?? "");
    } catch (err) {
      console.error("Support load error:", err);
    }
  }, [cafeId]);

  async function saveSupportPhone(e: React.FormEvent) {
    e.preventDefault();
    setSupportSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/app-support`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Saqlanmadi");
        return;
      }
      setSupportPhone(data.supportPhone ?? "");
      setSuccess("Qo'llab-quvvatlash raqami saqlandi");
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setSupportSaving(false);
    }
  }

  // Load all data on mount
  useEffect(() => {
    loadPromos();
    loadProducts();
    loadNotices();
    loadSupport();
  }, [loadPromos, loadProducts, loadNotices, loadSupport]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess("");
        setError("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  function resetPromoForm() {
    setPromoForm({
      name: "",
      type: "PERCENT",
      value: "",
      startTime: "",
      endTime: "",
      imageUrl: "",
      productId: "",
      slot: "",
    });
    setEditingPromoId(null);
    setPromoFormOpen(false);
  }

  function startEditPromo(p: Promo) {
    setEditingPromoId(p.id);
    setPromoForm({
      name: p.name,
      type: p.type,
      value: p.type === "FIXED" ? Math.floor(p.value / 100) : p.value,
      startTime: p.startTime ?? "",
      endTime: p.endTime ?? "",
      imageUrl: p.imageUrl ?? "",
      productId: p.productId ?? "",
      slot: (p.slot as 1 | 2 | 3 | null | undefined) ?? "",
    });
    setPromoFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Handle Add / Edit Promotion
  async function handleAddPromo(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (promoForm.value === "" || promoForm.value < 1) {
      setError("Foiz yoki summani kiriting");
      return;
    }
    setLoading(true);

    try {
      const payload = {
        name: promoForm.name,
        type: promoForm.type,
        value: promoForm.value,
        startTime: promoForm.startTime || null,
        endTime: promoForm.endTime || null,
        imageUrl: promoForm.imageUrl || null,
        productId: promoForm.productId || null,
        slot: promoForm.slot ? Number(promoForm.slot) : null,
        channel: "BANNER" as const,
      };

      const res = await fetch(
        editingPromoId
          ? `/api/promotions/${editingPromoId}`
          : `/api/cafes/${cafeId}/promotions`,
        {
          method: editingPromoId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            editingPromoId
              ? payload
              : {
                  ...payload,
                  startTime: promoForm.startTime || undefined,
                  endTime: promoForm.endTime || undefined,
                  imageUrl: promoForm.imageUrl || undefined,
                  productId: promoForm.productId || undefined,
                },
          ),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (editingPromoId ? "Aksiyani yangilab bo'lmadi" : "Aksiya qo'shishda xatolik yuz berdi"));
        setLoading(false);
        return;
      }

      const wasEditing = Boolean(editingPromoId);
      resetPromoForm();
      setSuccess(wasEditing ? "Aksiya muvaffaqiyatli yangilandi!" : "Aksiya muvaffaqiyatli qo'shildi!");
      loadPromos();
    } catch {
      setError("Kutilmagan xatolik");
    } finally {
      setLoading(false);
    }
  }

  // Toggle Promotion Active Status
  async function togglePromoActive(id: string, isActive: boolean) {
    try {
      await fetch(`/api/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      loadPromos();
      setSuccess("Aksiya holati yangilandi");
    } catch {
      setError("Xatolik yuz berdi");
    }
  }

  // Update Promotion Slot
  async function handleUpdatePromoSlot(id: string, slot: number | null) {
    try {
      await fetch(`/api/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      loadPromos();
      setSuccess("Aksiya joylashuvi muvaffaqiyatli yangilandi");
    } catch {
      setError("Joylashuvni o'zgartirishda xatolik yuz berdi");
    }
  }

  // Delete Promotion
  async function deletePromo(id: string) {
    if (!confirm("Ushbu aksiyani o'chirmoqchimisiz?")) return;
    try {
      await fetch(`/api/promotions/${id}`, { method: "DELETE" });
      loadPromos();
      setSuccess("Aksiya o'chirildi");
    } catch {
      setError("Xatolik yuz berdi");
    }
  }

  // Save Product Discount
  async function handleSaveDiscount(productId: string, clear = false) {
    setError("");
    setLoading(true);

    const value = clear ? null : parseFloat(discountInput);
    if (!clear && (isNaN(value as number) || (value as number) <= 0)) {
      setError("Chegirmali narxni to'g'ri kiriting");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountPriceSom: value,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Chegirmani saqlashda xatolik yuz berdi");
        setLoading(false);
        return;
      }

      setEditingDiscountId(null);
      setDiscountInput("");
      setSuccess(clear ? "Chegirma olib tashlandi" : "Chegirma muvaffaqiyatli saqlandi!");
      loadProducts();
    } catch {
      setError("Kutilmagan xatolik");
    } finally {
      setLoading(false);
    }
  }

  function startEditNotice(n: Notice) {
    setEditingNoticeId(n.id);
    setNoticeForm({
      title: n.title,
      body: n.body,
      priority: n.priority as "LOW" | "NORMAL" | "HIGH",
    });
    requestAnimationFrame(() => {
      noticeFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Handle Add or Edit Announcement (Notice)
  async function handleAddNotice(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const wasEditing = Boolean(editingNoticeId);

    try {
      const url = `/api/cafes/${cafeId}/notices`;
      const method = wasEditing ? "PATCH" : "POST";
      const bodyPayload = wasEditing
        ? {
            id: editingNoticeId,
            title: noticeForm.title,
            body: noticeForm.body,
            priority: noticeForm.priority,
            audience: "CUSTOMER",
          }
        : {
            title: noticeForm.title,
            body: noticeForm.body,
            priority: noticeForm.priority,
            audience: "CUSTOMER",
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "E'lon saqlashda xatolik yuz berdi");
        setLoading(false);
        return;
      }

      setNoticeForm({ title: "", body: "", priority: "NORMAL" });
      setEditingNoticeId(null);
      setSuccess(
        wasEditing
          ? "E'lon muvaffaqiyatli yangilandi!"
          : "E'lon muvaffaqiyatli joylandi va mijoz ilovasida ko'rinadi!",
      );
      loadNotices();
    } catch {
      setError("Kutilmagan xatolik");
    } finally {
      setLoading(false);
    }
  }

  // Delete Announcement (Notice)
  async function deleteNotice(id: string) {
    if (!confirm("Ushbu e'lonni o'chirmoqchimisiz?")) return;
    try {
      const res = await fetch(`/api/cafes/${cafeId}/notices?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadNotices();
        setSuccess("E'lon o'chirildi");
      } else {
        setError("O'chirishda xatolik");
      }
    } catch {
      setError("Xatolik yuz berdi");
    }
  }

  // Filtered products for discount tab
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--dp-accent-soft)]0/10 text-amber-600">
            <Smartphone className="h-5 w-5" />
          </span>
          <h1 className="text-2xl font-extrabold text-[var(--dp-text)]">Ilova sozlamalari</h1>
        </div>
        <p className="text-sm text-[var(--dp-muted)]">
          Banner aksiyalar faqat ko&apos;rinish uchun. Narxga ta&apos;sir qiladigan chegirma — «Taomlarga chegirmalar» bo&apos;limida.
        </p>
      </div>

      {/* Toast Messages */}
      {success && (
        <div className="rounded-xl border border-[var(--dp-accent)]/30 bg-[var(--dp-accent-soft)] p-4 text-sm font-semibold text-[var(--dp-text)] shadow-sm animate-fade-in">
          {success}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-semibold text-red-800 shadow-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-[var(--border)] overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab("promos")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === "promos"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
          }`}
        >
          <Gift className="h-4 w-4" />
          Aksiya bannerlari ({promos.length})
        </button>
        <button
          onClick={() => setActiveTab("discounts")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === "discounts"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
          }`}
        >
          <Tag className="h-4 w-4" />
          Taomlarga chegirmalar
        </button>
        <button
          onClick={() => setActiveTab("announcements")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === "announcements"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
          }`}
        >
          <Megaphone className="h-4 w-4" />
          Ilova e&apos;lonlari ({notices.length})
        </button>
        <button
          onClick={() => setActiveTab("support")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === "support"
              ? "border-amber-500 text-amber-600"
              : "border-transparent text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
          }`}
        >
          <Phone className="h-4 w-4" />
          Qo&apos;llab-quvvatlash
        </button>
      </div>

      {/* Tab Content: Promotions */}
      {activeTab === "promos" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[var(--dp-text)]">Ilova aksiya bloklari (banner)</h2>
              <p className="text-xs text-[var(--dp-muted)]">
                Faqat mijoz ilovasidagi rasm/banner bloklari. Bu yerda yuklangan aksiya narxlarni o&apos;zgartirmaydi — chegirma uchun «Taomlarga chegirmalar»ga o&apos;ting.
              </p>
            </div>
            <button
              onClick={() => {
                if (promoFormOpen) {
                  resetPromoForm();
                } else {
                  setEditingPromoId(null);
                  setPromoFormOpen(true);
                }
              }}
              className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-amber-700 transition"
            >
              {promoFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {promoFormOpen ? "Yopish" : "Aksiya qo&apos;shish"}
            </button>
          </div>

          {promoFormOpen && (
            <form
              onSubmit={handleAddPromo}
              className="dp-card rounded-2xl p-6 space-y-4 border border-[var(--border)] bg-[var(--dp-card-bg)] shadow-sm animate-slide-down"
            >
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-600">
                {editingPromoId ? "Aksiyani tahrirlash" : "Yangi aksiya yaratish"}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-[var(--dp-muted)]">Aksiya nomi</span>
                  <input
                    required
                    value={promoForm.name}
                    onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                    placeholder="Masalan: Juma chegirmasi yoki Happy Hour"
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--dp-input-bg,var(--dp-card))] px-3 py-2.5 text-sm text-[var(--dp-text)] outline-none focus:border-amber-500 transition"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[var(--dp-muted)]">
                    Banner yozuvi turi (narxga ta&apos;sir qilmaydi)
                  </span>
                  <select
                    value={promoForm.type}
                    onChange={(e) =>
                      setPromoForm({
                        ...promoForm,
                        type: e.target.value as "PERCENT" | "FIXED",
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--dp-input-bg,var(--dp-card))] px-3 py-2.5 text-sm text-[var(--dp-text)] outline-none focus:border-amber-500 transition"
                  >
                    <option value="PERCENT">Foiz yozuvi (%)</option>
                    <option value="FIXED">Summa yozuvi (so&apos;m)</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[var(--dp-muted)]">
                    {promoForm.type === "PERCENT"
                      ? "Banner foizi (%) — faqat yozuv"
                      : "Banner summasi (so'm) — faqat yozuv"}
                  </span>
                  <NumberInput
                    required
                    min={1}
                    max={promoForm.type === "PERCENT" ? 100 : undefined}
                    value={promoForm.value}
                    onValueChange={(v) => setPromoForm({ ...promoForm, value: v })}
                    placeholder={
                      promoForm.type === "PERCENT" ? "Masalan: 15" : "Masalan: 5000"
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--dp-input-bg,var(--dp-card))] px-3 py-2.5 text-sm text-[var(--dp-text)] outline-none focus:border-amber-500 transition"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[var(--dp-muted)]">Boshlanish vaqti (ixtiyoriy)</span>
                  <input
                    type="time"
                    value={promoForm.startTime}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, startTime: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--dp-input-bg,var(--dp-card))] px-3 py-2.5 text-sm text-[var(--dp-text)] outline-none focus:border-amber-500 transition"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-bold text-[var(--dp-muted)]">Tugash vaqti (ixtiyoriy)</span>
                  <input
                    type="time"
                    value={promoForm.endTime}
                    onChange={(e) => setPromoForm({ ...promoForm, endTime: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--dp-input-bg,var(--dp-card))] px-3 py-2.5 text-sm text-[var(--dp-text)] outline-none focus:border-amber-500 transition"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-[var(--dp-muted)]">
                    Aksiya rasmi (1 ta)
                  </span>
                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    {promoForm.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={promoForm.imageUrl}
                        alt=""
                        className="h-14 w-14 rounded-xl object-cover ring-1 ring-[var(--border)]"
                      />
                    ) : null}
                    <label className="cursor-pointer rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--dp-card-header)]">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="sr-only"
                        disabled={loading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setLoading(true);
                          try {
                            const { uploadCafeImage } = await import(
                              "@/lib/upload-client"
                            );
                            const result = await uploadCafeImage(
                              cafeId,
                              file,
                              promoForm.imageUrl || null,
                            );
                            if ("url" in result) {
                              setPromoForm({
                                ...promoForm,
                                imageUrl: result.url,
                              });
                            } else {
                              setError(result.error);
                            }
                          } catch {
                            setError("Rasm yuklanmadi");
                          } finally {
                            setLoading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      Rasm yuklash
                    </label>
                    {promoForm.imageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setPromoForm({ ...promoForm, imageUrl: "" })
                        }
                        className="text-sm font-semibold text-[var(--dp-muted)]"
                      >
                        Olib tashlash
                      </button>
                    )}
                  </div>
                  <input
                    value={promoForm.imageUrl}
                    onChange={(e) =>
                      setPromoForm({ ...promoForm, imageUrl: e.target.value })
                    }
                    placeholder="yoki URL: https://..."
                    className="mt-2 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none focus:border-amber-500 transition"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-[var(--dp-muted)]">Taomga bog'lash (ixtiyoriy - bosilganda shu taom ochiladi)</span>
                  <select
                    value={promoForm.productId}
                    onChange={(e) => setPromoForm({ ...promoForm, productId: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--dp-input-bg,var(--dp-card))] px-3 py-2.5 text-sm text-[var(--dp-text)] outline-none focus:border-amber-500 transition"
                  >
                    <option value="">-- Bog'lanmagan --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.category.name})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs font-bold text-[var(--dp-muted)]">Ilovadagi joylashuv bloki (Slot)</span>
                  <select
                    value={promoForm.slot}
                    onChange={(e) => setPromoForm({ ...promoForm, slot: e.target.value ? Number(e.target.value) as 1 | 2 | 3 : "" })}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--dp-input-bg,var(--dp-card))] px-3 py-2.5 text-sm text-[var(--dp-text)] outline-none focus:border-amber-500 transition"
                  >
                    <option value="">-- Avtomatik joylashuv --</option>
                    <option value="1">1-blok (Katta chap blok - 15% yozilgan joy)</option>
                    <option value="2">2-blok (Tepa o'ng blok - 27% yozilgan joy)</option>
                    <option value="3">3-blok (Pastki o'ng blok - Yetkazish yozilgan joy)</option>
                  </select>
                </label>
              </div>
              <p className="text-[11px] text-[var(--dp-muted)]">
                * Vaqt kiritilmasa, aksiya kun bo&apos;yi faol hisoblanadi.
              </p>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition disabled:opacity-50"
              >
                {editingPromoId ? "O'zgarishlarni saqlash" : "Saqlash"}
              </button>
            </form>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {promos.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-3 text-center py-12 text-[var(--dp-muted)]">
                Hozircha hech qanday aksiya yo&apos;q.
              </div>
            ) : (
              promos.map((p) => (
                <div
                  key={p.id}
                  className={`dp-card rounded-2xl p-5 border flex flex-col justify-between gap-4 transition ${
                    p.activeNow
                      ? "border-[var(--dp-accent)] bg-[var(--dp-accent-soft)]"
                      : "border-[var(--border)]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-amber-600">
                        {p.type === "PERCENT" ? "Foizli chegirma" : "Ruxsat etilgan chegirma"}
                      </span>
                      {p.activeNow && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--dp-accent-soft)] px-2 py-0.5 text-[10px] font-black text-[var(--dp-accent)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                          Hozir faol
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-[var(--dp-text)] text-base">{p.name}</h3>
                    <p className="text-sm font-bold text-[var(--dp-muted)]">
                      {p.label}
                    </p>
                    {p.startTime && p.endTime && (
                      <p className="text-xs text-[var(--dp-muted)]">
                        Amal qilish vaqti: {p.startTime} — {p.endTime}
                      </p>
                    )}
                    <div className="mt-2.5 pt-2.5 border-t border-[var(--border)]/50">
                      <span className="text-xs font-bold text-[var(--dp-muted)] block mb-1">Ilovadagi joylashuv bloki (Slot):</span>
                      <select
                        value={p.slot || ""}
                        onChange={(e) => handleUpdatePromoSlot(p.id, e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--dp-input-bg,var(--dp-card))] px-2 py-1.5 text-xs text-[var(--dp-text)] outline-none focus:border-amber-500 transition"
                      >
                        <option value="">-- Avtomatik joylashuv --</option>
                        <option value="1">1-blok (Katta chap blok - 15% yozilgan joy)</option>
                        <option value="2">2-blok (Tepa o'ng blok - 27% yozilgan joy)</option>
                        <option value="3">3-blok (Pastki o'ng blok - Yetkazish yozilgan joy)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                    <button
                      onClick={() => togglePromoActive(p.id, p.isActive)}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                        p.isActive
                          ? "bg-[var(--dp-card-header)] text-[var(--dp-text)] hover:opacity-90 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                          : "bg-amber-600 text-white hover:bg-amber-700"
                      }`}
                    >
                      {p.isActive ? "To'xtatish" : "Yoqish"}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditPromo(p)}
                        className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-[var(--dp-accent)] hover:bg-[var(--dp-accent-soft)] transition"
                        title="Tahrirlash"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Tahrirlash
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePromo(p.id)}
                        className="rounded-xl p-2 text-red-500 hover:bg-red-50 transition"
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Discounts on Dishes */}
      {activeTab === "discounts" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--dp-text)]">Taomlarga individual chegirmalar (Skidka)</h2>
            <p className="text-xs text-[var(--dp-muted)]">
              Bu yerda belgilangan chegirma narxi mijoz ilovasida ko&apos;rinadi va buyurtma summasiga ham shu narx bilan tushadi.
            </p>
          </div>

          {/* Search bar */}
          <div className="flex max-w-md items-center gap-2.5 rounded-xl border border-[var(--border)] px-3 py-2">
            <Tag className="h-4 w-4 text-[var(--dp-muted)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Taom yoki kategoriya nomi bo'yicha qidirish…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--dp-muted)]"
            />
          </div>

          {/* Products List */}
          <div className="dp-card rounded-2xl overflow-hidden border border-[var(--border)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--dp-card-bg)] text-xs font-bold uppercase tracking-wider text-[var(--dp-muted)]">
                    <th className="p-4">Taom nomi</th>
                    <th className="p-4">Kategoriya</th>
                    <th className="p-4">Asl narxi</th>
                    <th className="p-4">Chegirmali narxi</th>
                    <th className="p-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[var(--dp-muted)]">
                        Hech qanday taom topilmadi.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isEditing = editingDiscountId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-stone-50/50 transition">
                          <td className="p-4 font-bold text-[var(--dp-text)]">{p.name}</td>
                          <td className="p-4 text-[var(--dp-muted)]">{p.category.name}</td>
                          <td className="p-4 font-medium text-[var(--dp-text)]">
                            {formatPrice(p.price)}
                          </td>
                          <td className="p-4">
                            {isEditing ? (
                              <input
                                autoFocus
                                type="number"
                                value={discountInput}
                                onChange={(e) => setDiscountInput(e.target.value)}
                                placeholder="So'mda kiriting"
                                className="w-32 rounded-lg border border-amber-500 bg-transparent px-2 py-1 text-sm outline-none"
                              />
                            ) : p.discountPrice ? (
                              <span className="font-extrabold text-red-600">
                                {formatPrice(p.discountPrice)}
                              </span>
                            ) : (
                              <span className="text-xs text-[var(--dp-muted)]">Chegirmasiz</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleSaveDiscount(p.id)}
                                  className="rounded-lg bg-green-600 p-1.5 text-white hover:bg-green-700"
                                  title="Saqlash"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingDiscountId(null);
                                    setDiscountInput("");
                                  }}
                                  className="rounded-lg bg-[var(--dp-card-header)] p-1.5 text-[var(--dp-subtle)] hover:opacity-90"
                                  title="Bekor qilish"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingDiscountId(p.id);
                                    setDiscountInput(
                                      p.discountPrice
                                        ? (p.discountPrice / 100).toString()
                                        : ""
                                    );
                                  }}
                                  className="rounded-lg bg-[var(--dp-accent-soft)] px-2.5 py-1 text-xs font-bold text-[var(--dp-accent)] hover:bg-[var(--dp-accent-soft)] transition"
                                >
                                  {p.discountPrice ? "Tahrirlash" : "Chegirma qo'shish"}
                                </button>
                                {p.discountPrice && (
                                  <button
                                    onClick={() => handleSaveDiscount(p.id, true)}
                                    className="rounded-lg p-1 text-red-500 hover:bg-red-50 transition"
                                    title="Chegirmani o'chirish"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Announcements */}
      {activeTab === "announcements" && (
        <div className="grid gap-6 md:grid-cols-3">
          {/* Form */}
          <div className="md:col-span-1">
            <form
              ref={noticeFormRef}
              onSubmit={handleAddNotice}
              className="dp-card rounded-2xl p-5 border border-[var(--border)] bg-[var(--dp-card-bg)] space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--dp-text)]">
                    {editingNoticeId ? "E'lonni tahrirlash" : "Yangi e'lon berish"}
                  </h3>
                  <p className="text-xs text-[var(--dp-muted)]">
                    Mijozlar ilovasida e&apos;lonlar va yangiliklar blokida ko&apos;rinadi.
                  </p>
                </div>
                {editingNoticeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingNoticeId(null);
                      setNoticeForm({ title: "", body: "", priority: "NORMAL" });
                    }}
                    className="text-xs font-bold text-red-500 hover:underline"
                  >
                    Bekor qilish
                  </button>
                )}
              </div>

              <label className="block">
                <span className="text-xs font-bold text-[var(--dp-muted)]">Sarlavha</span>
                <input
                  required
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  placeholder="Masalan: Yangi pitsa menyuda!"
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-500 transition"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[var(--dp-muted)]">Tafsilotlar</span>
                <textarea
                  required
                  rows={4}
                  value={noticeForm.body}
                  onChange={(e) => setNoticeForm({ ...noticeForm, body: e.target.value })}
                  placeholder="E'lon matni..."
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-500 transition"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold text-[var(--dp-muted)]">Muhimlik darajasi</span>
                <select
                  value={noticeForm.priority}
                  onChange={(e) =>
                    setNoticeForm({
                      ...noticeForm,
                      priority: e.target.value as "LOW" | "NORMAL" | "HIGH",
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm outline-none focus:border-amber-500 transition"
                >
                  <option value="LOW">Past</option>
                  <option value="NORMAL">O&apos;rtacha</option>
                  <option value="HIGH">Yuqori</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white hover:bg-amber-700 transition disabled:opacity-50"
              >
                {editingNoticeId ? "Saqlash" : "E'lonni joylash"}
              </button>
            </form>
          </div>

          {/* List */}
          <div className="md:col-span-2 space-y-3">
            <h3 className="text-base font-bold text-[var(--dp-text)]">Faol e&apos;lonlar</h3>
            {notices.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-2xl text-[var(--dp-muted)]">
                Hozircha hech qanday e&apos;lon joylanmagan.
              </div>
            ) : (
              notices.map((n) => (
                <div
                  key={n.id}
                  className="dp-card rounded-2xl p-4 border border-[var(--border)] flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          n.priority === "HIGH"
                            ? "bg-red-100 text-red-800"
                            : n.priority === "LOW"
                              ? "bg-[var(--dp-card-header)] text-[var(--dp-subtle)]"
                              : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {n.priority === "HIGH" ? "Yuqori" : n.priority === "LOW" ? "Past" : "O'rtacha"}
                      </span>
                      <span className="text-[10px] text-[var(--dp-muted)]">
                        {new Date(n.createdAt).toLocaleDateString("uz-UZ", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h4 className="font-extrabold text-[var(--dp-text)] text-sm">{n.title}</h4>
                    <p className="text-xs text-[var(--dp-subtle)] whitespace-pre-wrap leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditNotice(n)}
                      className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-[var(--dp-accent)] hover:bg-[var(--dp-accent-soft)] transition"
                      title="E'lonni tahrirlash"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Tahrirlash
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteNotice(n.id)}
                      className="rounded-xl p-2 text-red-500 hover:bg-red-50 transition"
                      title="E'lonni o'chirish"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "support" && (
        <div className="max-w-lg space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--dp-text)]">
              Qo&apos;llab-quvvatlash telefoni
            </h2>
            <p className="mt-1 text-xs text-[var(--dp-muted)]">
              Bu raqam faqat mijoz ilovasida ko&apos;rinadi. Mijoz bir bosishda
              qo&apos;ng&apos;iroq qilishi mumkin.
            </p>
          </div>
          <form
            onSubmit={saveSupportPhone}
            className="dp-card space-y-4 rounded-2xl border border-[var(--border)] p-5 shadow-sm"
          >
            <label className="block">
              <span className="text-xs font-bold text-[var(--dp-muted)]">
                Telefon raqam
              </span>
              <input
                type="tel"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                className="mt-1 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm outline-none transition focus:border-amber-500"
              />
            </label>
            <p className="text-xs text-[var(--dp-muted)]">
              Bo&apos;sh qoldirsangiz — ilovada qo&apos;llab-quvvatlash tugmasi
              ko&apos;rinmaydi.
            </p>
            <button
              type="submit"
              disabled={supportSaving}
              className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:opacity-50"
            >
              {supportSaving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
