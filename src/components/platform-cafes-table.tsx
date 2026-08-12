"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  Check,
  CheckCircle2,
  Copy,
  KeyRound,
  MapPin,
  Pencil,
  Plus,
  Search,
  Shield,
} from "lucide-react";
import { planLabel } from "@/lib/plans";
import { ensureSlug } from "@/lib/utils";
import { CAFE_STATUS_LABELS } from "@/lib/utils";
import { getSuspendReasonLabel } from "@/lib/cafe-suspension";
import { UZ_REGIONS } from "@/lib/uz-regions";
import { PasswordField } from "@/components/password-field";

type CafeRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  suspendReason?: string | null;
  plan: "STARTER" | "STANDARD" | "PRO";
  address?: string | null;
  region?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  trialEndsAt?: string | null;
  subscriptionEndsAt?: string | null;
  owner: { name: string; email: string; phone?: string | null };
};

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  // UTC — API endOfDay UTC bilan mos
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PlatformCafesTable({
  cafes,
  canManage = true,
}: {
  cafes: CafeRow[];
  canManage?: boolean;
}) {
  const [rows, setRows] = useState(cafes);
  const [search, setSearch] = useState("");
  const [listFilter, setListFilter] = useState<"all" | "blocked">("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<CafeRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pwCafe, setPwCafe] = useState<CafeRow | null>(null);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [revealedOwnerPassword, setRevealedOwnerPassword] = useState<string | null>(
    null,
  );
  const [pwCopied, setPwCopied] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    region: "",
    plan: "STARTER" as CafeRow["plan"],
    status: "TRIAL",
    trialEndsAt: "",
    subscriptionEndsAt: "",
  });
  const [createForm, setCreateForm] = useState({
    cafeName: "",
    slug: "",
    ownerName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    region: "",
    plan: "STARTER" as CafeRow["plan"],
    status: "TRIAL",
    trialDays: "14",
  });

  function openCreate() {
    setCreateError(null);
    setCreateForm({
      cafeName: "",
      slug: "",
      ownerName: "",
      email: "",
      password: "",
      phone: "",
      address: "",
      region: "",
      plan: "STARTER",
      status: "TRIAL",
      trialDays: "14",
    });
    setCreateOpen(true);
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/platform/cafes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeName: createForm.cafeName.trim(),
          slug: createForm.slug.trim() || undefined,
          ownerName: createForm.ownerName.trim(),
          email: createForm.email.trim(),
          password: createForm.password,
          phone: createForm.phone.trim() || undefined,
          address: createForm.address.trim() || undefined,
          region: createForm.region || undefined,
          plan: createForm.plan,
          status: createForm.status,
          trialDays: Number(createForm.trialDays) || 14,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        cafe?: CafeRow;
        error?: string;
      };
      if (!res.ok || !data.cafe) {
        setCreateError(data.error ?? "Yaratishda xatolik");
        return;
      }
      const c = data.cafe;
      setRows((prev) => [
        {
          id: c.id,
          name: c.name,
          slug: c.slug,
          status: c.status,
          plan: c.plan as CafeRow["plan"],
          address: null,
          region: createForm.region || null,
          phone: createForm.phone || null,
          trialEndsAt: c.trialEndsAt ?? null,
          subscriptionEndsAt: null,
          owner: c.owner,
        },
        ...prev,
      ]);
      setCreateOpen(false);
    } catch {
      setCreateError("Tarmoq xatosi");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(cafe: CafeRow) {
    setEditError(null);
    setEdit(cafe);
    setForm({
      name: cafe.name,
      address: cafe.address ?? "",
      phone: cafe.phone ?? "",
      region: cafe.region ?? "",
      plan: cafe.plan,
      status: cafe.status,
      trialEndsAt: toDateInput(cafe.trialEndsAt),
      subscriptionEndsAt: toDateInput(cafe.subscriptionEndsAt),
    });
  }

  function closeEdit() {
    setEdit(null);
    setEditError(null);
    setSaving(false);
  }

  function openOwnerPassword(cafe: CafeRow) {
    setPwError(null);
    setRevealedOwnerPassword(null);
    setOwnerPassword("");
    setPwCopied(false);
    setPwCafe(cafe);
  }

  function closeOwnerPassword() {
    setPwCafe(null);
    setOwnerPassword("");
    setPwError(null);
    setRevealedOwnerPassword(null);
    setPwSaving(false);
    setPwCopied(false);
  }

  async function submitOwnerPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwCafe || pwSaving) return;
    setPwSaving(true);
    setPwError(null);
    setRevealedOwnerPassword(null);
    try {
      const res = await fetch(`/api/platform/cafes/${pwCafe.id}/owner-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: ownerPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        password?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        setPwError(data.error ?? "Parolni o'rnatishda xatolik");
        return;
      }
      setRevealedOwnerPassword(data.password ?? ownerPassword);
      setOwnerPassword("");
    } catch {
      setPwError("Tarmoq xatosi");
    } finally {
      setPwSaving(false);
    }
  }

  async function copyOwnerPassword() {
    if (!revealedOwnerPassword) return;
    try {
      await navigator.clipboard.writeText(revealedOwnerPassword);
      setPwCopied(true);
      setTimeout(() => setPwCopied(false), 2000);
    } catch {
      setPwError("Nusxa olish amalga oshmadi");
    }
  }

  async function patchCafe(
    cafeId: string,
    body: Record<string, unknown>,
  ): Promise<{ cafe?: CafeRow; error?: string }> {
    setLoadingId(cafeId);
    try {
      const res = await fetch(`/api/platform/cafes/${cafeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        cafe?: CafeRow;
        error?: string;
      };
      if (!res.ok || !data.cafe) {
        return { error: data.error ?? "Saqlashda xatolik" };
      }
      const cafe = data.cafe;
      setRows((prev) =>
        prev.map((c) =>
          c.id === cafeId
            ? {
                ...c,
                name: cafe.name,
                status: cafe.status,
                plan: cafe.plan as CafeRow["plan"],
                address: cafe.address,
                region: cafe.region,
                phone: cafe.phone,
                latitude: cafe.latitude,
                longitude: cafe.longitude,
                trialEndsAt: cafe.trialEndsAt,
                subscriptionEndsAt: cafe.subscriptionEndsAt,
                suspendReason: cafe.suspendReason,
              }
            : c,
        ),
      );
      return { cafe };
    } catch {
      return { error: "Tarmoq xatosi" };
    } finally {
      setLoadingId(null);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit || saving) return;
    setSaving(true);
    setEditError(null);
    const result = await patchCafe(edit.id, {
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      region: form.region || null,
      plan: form.plan,
      status: form.status,
      trialEndsAt: form.trialEndsAt || null,
      subscriptionEndsAt: form.subscriptionEndsAt || null,
    });
    setSaving(false);
    if (result.cafe) {
      closeEdit();
      return;
    }
    setEditError(result.error ?? "Saqlashda xatolik");
  }

  async function setStatus(cafeId: string, status: string) {
    setActionError(null);
    const result = await patchCafe(cafeId, { status });
    if (result.error) setActionError(result.error);
  }

  async function updatePlan(cafeId: string, plan: CafeRow["plan"], extendDays?: number) {
    setActionError(null);
    const result = await patchCafe(cafeId, {
      plan,
      ...(extendDays ? { extendDays } : {}),
    });
    if (result.error) setActionError(result.error);
  }

  const blockedCount = useMemo(
    () => rows.filter((c) => c.status === "SUSPENDED" || c.status === "CANCELLED").length,
    [rows],
  );

  const filteredRows = useMemo(() => {
    let list =
      listFilter === "blocked"
        ? rows.filter((c) => c.status === "SUSPENDED" || c.status === "CANCELLED")
        : rows;

    const q = search.trim().toLowerCase();
    if (!q) return list;
    const digits = q.replace(/\D/g, "");
    return list.filter((cafe) => {
      const haystack = [
        cafe.name,
        cafe.slug,
        cafe.phone ?? "",
        cafe.owner.name,
        cafe.owner.email,
        cafe.owner.phone ?? "",
        cafe.address ?? "",
        cafe.region ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (haystack.includes(q)) return true;
      if (digits.length >= 3) {
        const phones = [cafe.phone, cafe.owner.phone]
          .filter(Boolean)
          .map((p) => String(p).replace(/\D/g, ""));
        return phones.some((p) => p.includes(digits));
      }
      return false;
    });
  }, [rows, search, listFilter]);

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Kafe nomi, telefon, egasi..."
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setListFilter("all")}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                listFilter === "all"
                  ? "bg-violet-600 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              Barchasi
            </button>
            <button
              type="button"
              onClick={() => setListFilter("blocked")}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                listFilter === "blocked"
                  ? "bg-red-600 text-white"
                  : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              <Ban className="h-4 w-4" />
              Bloklanganlar
              {blockedCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    listFilter === "blocked" ? "bg-white/20" : "bg-red-100 text-red-700"
                  }`}
                >
                  {blockedCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Yangi mijoz
          </button>
        ) : null}
      </div>

      {(search.trim() || listFilter === "blocked") && (
        <p className="mt-2 text-sm text-stone-500">
          {filteredRows.length} ta natija topildi
          {listFilter === "blocked" ? " (bloklangan)" : ""}
        </p>
      )}

      {actionError ? (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {actionError}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-stone-100">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-stone-50">
            <tr className="text-stone-500">
              <th className="px-4 py-3 font-medium">Kafe</th>
              <th className="px-4 py-3 font-medium">Hudud</th>
              <th className="px-4 py-3 font-medium">Egasi</th>
              <th className="px-4 py-3 font-medium">Holat</th>
              <th className="px-4 py-3 font-medium">Tarif</th>
              <th className="px-4 py-3 font-medium">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((cafe) => (
              <tr key={cafe.id} className="border-t border-stone-100">
                <td className="px-4 py-3">
                  <p className="font-medium text-stone-900">{cafe.name}</p>
                  <p className="text-xs text-stone-400">/{cafe.slug}</p>
                  {cafe.phone && (
                    <p className="mt-0.5 text-xs text-stone-600">{cafe.phone}</p>
                  )}
                  {cafe.address && (
                    <p className="mt-0.5 max-w-[200px] truncate text-xs text-stone-400">
                      {cafe.address}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-stone-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-stone-400" />
                    {cafe.region || "—"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <p>{cafe.owner.name}</p>
                  <p className="text-xs text-stone-400">{cafe.owner.email}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={cafe.status} />
                  {(cafe.status === "SUSPENDED" || cafe.status === "CANCELLED") && (
                    <p className="mt-1 text-xs font-medium text-red-600">
                      {getSuspendReasonLabel(
                        (cafe.suspendReason as "ADMIN" | "BILLING" | "TRIAL" | null) ?? null,
                        cafe.status,
                      )}
                    </p>
                  )}
                  {cafe.status === "TRIAL" && cafe.trialEndsAt && (
                    <p className="mt-1 text-xs text-stone-400">
                      {new Date(cafe.trialEndsAt).toLocaleDateString("uz-UZ")}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <select
                      value={cafe.plan}
                      disabled={loadingId === cafe.id}
                      onChange={(e) =>
                        void updatePlan(cafe.id, e.target.value as CafeRow["plan"])
                      }
                      className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                    >
                      <option value="STARTER">{planLabel("STARTER")}</option>
                      <option value="STANDARD">{planLabel("STANDARD")}</option>
                      <option value="PRO">{planLabel("PRO")}</option>
                    </select>
                  ) : (
                    <span className="text-sm text-stone-700">{planLabel(cafe.plan)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={loadingId === cafe.id}
                        onClick={() => openEdit(cafe)}
                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs font-semibold hover:bg-stone-50"
                      >
                        <Pencil className="h-3 w-3" />
                        Tahrir
                      </button>
                      <button
                        type="button"
                        disabled={loadingId === cafe.id}
                        onClick={() => openOwnerPassword(cafe)}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                      >
                        <KeyRound className="h-3 w-3" />
                        Parol
                      </button>
                      <button
                        type="button"
                        disabled={loadingId === cafe.id}
                        onClick={() => void updatePlan(cafe.id, cafe.plan, 30)}
                        className="rounded-lg bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        +30 kun
                      </button>
                      {cafe.status === "SUSPENDED" ? (
                        <button
                          type="button"
                          disabled={loadingId === cafe.id}
                          onClick={() => void setStatus(cafe.id, "ACTIVE")}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Faollashtirish
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={loadingId === cafe.id || cafe.status === "CANCELLED"}
                          onClick={() => void setStatus(cafe.id, "SUSPENDED")}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          <Ban className="h-3 w-3" />
                          Bloklash
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-stone-400">Faqat ko‘rish</span>
                  )}
                </td>
              </tr>
            ))}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  {search.trim() || listFilter === "blocked"
                    ? "Qidiruv bo'yicha natija topilmadi"
                    : "Hali mijoz yo'q"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setCreateOpen(false)}
        >
          <form
            onSubmit={(e) => void submitCreate(e)}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-bold text-stone-900">Yangi mijoz qo&apos;shish</h2>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Kafe nomi</span>
                <input
                  required
                  minLength={2}
                  value={createForm.cafeName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setCreateForm((f) => ({
                      ...f,
                      cafeName: name,
                      slug: f.slug || ensureSlug(name),
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">URL (slug)</span>
                <input
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  placeholder="my-cafe"
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Egasi ismi</span>
                <input
                  required
                  value={createForm.ownerName}
                  onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Email</span>
                <input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>
              <PasswordField
                label="Parol"
                required
                minLength={6}
                value={createForm.password}
                onChange={(password) => setCreateForm({ ...createForm, password })}
                inputClassName="w-full rounded-xl border border-stone-200 px-3 py-2 pr-11"
              />
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Telefon</span>
                <input
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Hudud</span>
                <select
                  value={createForm.region}
                  onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                >
                  <option value="">Tanlanmagan</option>
                  {UZ_REGIONS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-medium text-stone-600">Tarif</span>
                  <select
                    value={createForm.plan}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        plan: e.target.value as CafeRow["plan"],
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                  >
                    <option value="STARTER">{planLabel("STARTER")}</option>
                    <option value="STANDARD">{planLabel("STANDARD")}</option>
                    <option value="PRO">{planLabel("PRO")}</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-stone-600">Sinov (kun)</span>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={createForm.trialDays}
                    onChange={(e) => setCreateForm({ ...createForm, trialDays: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                  />
                </label>
              </div>
            </div>
            {createError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold"
              >
                Bekor
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {creating ? "Yaratilmoqda…" : "Yaratish"}
              </button>
            </div>
          </form>
        </div>
      )}

      {pwCafe && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeOwnerPassword}
        >
          <form
            onSubmit={(e) => void submitOwnerPassword(e)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-bold text-stone-900">
                Egaga yangi parol
              </h2>
            </div>
            <p className="text-sm text-stone-600">
              <span className="font-semibold text-stone-900">{pwCafe.name}</span>
              {" — "}
              {pwCafe.owner.name} ({pwCafe.owner.email})
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Mijoz parolini unutgan bo&apos;lsa yangisini o&apos;rnating. Ko&apos;z
              tugmasi bilan ochiq ko&apos;ring, keyin nusxa olib bering.
            </p>
            {!revealedOwnerPassword ? (
              <div className="mt-4">
                <PasswordField
                  label="Yangi parol"
                  required
                  minLength={6}
                  value={ownerPassword}
                  onChange={setOwnerPassword}
                  autoComplete="new-password"
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm font-semibold text-emerald-800">
                  Parol o&apos;rnatildi:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-stone-900 ring-1 ring-emerald-100">
                    {revealedOwnerPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyOwnerPassword()}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                  >
                    {pwCopied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {pwCopied ? "Nusxa" : "Nusxa"}
                  </button>
                </div>
              </div>
            )}
            {pwError ? (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {pwError}
              </p>
            ) : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeOwnerPassword}
                disabled={pwSaving}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold"
              >
                {revealedOwnerPassword ? "Yopish" : "Bekor"}
              </button>
              {!revealedOwnerPassword ? (
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {pwSaving ? "Saqlanmoqda…" : "O'rnatish"}
                </button>
              ) : null}
            </div>
          </form>
        </div>
      )}

      {edit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeEdit}
        >
          <form
            onSubmit={(e) => void saveEdit(e)}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-bold text-stone-900">Kafe tahrirlash</h2>
            </div>
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Nomi</span>
                <input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Manzil</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Telefon</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Hudud (xarita)</span>
                <select
                  value={form.region}
                  onChange={(e) => setForm({ ...form, region: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                >
                  <option value="">Tanlanmagan</option>
                  {UZ_REGIONS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Sinov muddati</span>
                <input
                  type="date"
                  value={form.trialEndsAt}
                  onChange={(e) => setForm({ ...form, trialEndsAt: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
                <span className="mt-1 block text-xs text-stone-400">
                  O&apos;tgan sana — sinov tugagan deb bloklanadi (tarif faollashtirish ko&apos;rinadi)
                </span>
              </label>
              <label className="block text-sm">
                <span className="font-medium text-stone-600">Obuna muddati</span>
                <input
                  type="date"
                  value={form.subscriptionEndsAt}
                  onChange={(e) =>
                    setForm({ ...form, subscriptionEndsAt: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                />
                <span className="mt-1 block text-xs text-stone-400">
                  Faol obuna uchun. O&apos;tgan sana — to&apos;lov muddati tugagan deb bloklanadi
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="font-medium text-stone-600">Tarif</span>
                  <select
                    value={form.plan}
                    onChange={(e) =>
                      setForm({ ...form, plan: e.target.value as CafeRow["plan"] })
                    }
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                  >
                    <option value="STARTER">{planLabel("STARTER")}</option>
                    <option value="STANDARD">{planLabel("STANDARD")}</option>
                    <option value="PRO">{planLabel("PRO")}</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium text-stone-600">Holat</span>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2"
                  >
                    <option value="TRIAL">Sinov</option>
                    <option value="ACTIVE">Faol</option>
                    <option value="SUSPENDED">Bloklangan</option>
                    <option value="CANCELLED">Bekor</option>
                  </select>
                </label>
              </div>
            </div>
            {editError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {editError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                Bekor
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    TRIAL: "bg-amber-100 text-amber-700",
    SUSPENDED: "bg-red-100 text-red-700",
    CANCELLED: "bg-stone-100 text-stone-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? ""}`}>
      {CAFE_STATUS_LABELS[status] ?? status}
    </span>
  );
}
