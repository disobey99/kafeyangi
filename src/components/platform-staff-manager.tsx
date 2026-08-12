"use client";

import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, Pencil, Trash2, UserPlus } from "lucide-react";
import {
  PLATFORM_PERMISSION_DEFS,
  ROLE_PERMISSION_PRESETS,
  type PlatformPermission,
} from "@/lib/platform-permissions";
import {
  PLATFORM_STAFF_ROLE_LABELS,
  type PlatformStaffRole,
  type PlatformStaffRow,
} from "@/lib/platform-staff-shared";
import { PasswordField } from "@/components/password-field";

const ROLES: PlatformStaffRole[] = ["ADMIN", "SUPPORT", "ANALYST"];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "SUPPORT" as PlatformStaffRole,
  permissions: [...ROLE_PERMISSION_PRESETS.SUPPORT] as PlatformPermission[],
};

export function PlatformStaffManager({ initial }: { initial: PlatformStaffRow[] }) {
  const [rows, setRows] = useState(initial);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<PlatformStaffRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [pwStaff, setPwStaff] = useState<PlatformStaffRow | null>(null);
  const [staffPassword, setStaffPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [revealedStaffPassword, setRevealedStaffPassword] = useState<string | null>(
    null,
  );
  const [pwCopied, setPwCopied] = useState(false);

  useEffect(() => setRows(initial), [initial]);

  function openCreate() {
    setEdit(null);
    setError("");
    setRevealedPassword(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: PlatformStaffRow) {
    setEdit(row);
    setError("");
    setRevealedPassword(null);
    setForm({
      name: row.name,
      email: row.email,
      phone: row.phone ?? "",
      password: "",
      role: row.role,
      permissions: [...row.permissions],
    });
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEdit(null);
    setError("");
    setForm(emptyForm);
    setRevealedPassword(null);
    setCopied(false);
  }

  function openStaffPassword(row: PlatformStaffRow) {
    setPwStaff(row);
    setStaffPassword("");
    setPwError("");
    setRevealedStaffPassword(null);
    setPwCopied(false);
  }

  function closeStaffPassword() {
    setPwStaff(null);
    setStaffPassword("");
    setPwError("");
    setRevealedStaffPassword(null);
    setPwSaving(false);
    setPwCopied(false);
  }

  function setRole(role: PlatformStaffRole) {
    setForm((prev) => {
      const keepHide = prev.permissions.includes("flag.hide_revenue");
      const next = [...ROLE_PERMISSION_PRESETS[role]] as PlatformPermission[];
      if (keepHide && !next.includes("flag.hide_revenue")) {
        next.push("flag.hide_revenue");
      }
      return { ...prev, role, permissions: next };
    });
  }

  function togglePermission(key: PlatformPermission) {
    setForm((prev) => {
      const has = prev.permissions.includes(key);
      return {
        ...prev,
        permissions: has
          ? prev.permissions.filter((p) => p !== key)
          : [...prev.permissions, key],
      };
    });
  }

  async function copyText(value: string, kind: "form" | "modal") {
    try {
      await navigator.clipboard.writeText(value);
      if (kind === "form") {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        setPwCopied(true);
        setTimeout(() => setPwCopied(false), 2000);
      }
    } catch {
      if (kind === "form") setError("Nusxa olish amalga oshmadi");
      else setPwError("Nusxa olish amalga oshmadi");
    }
  }

  async function saveStaff(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRevealedPassword(null);
    try {
      if (form.permissions.length === 0) {
        throw new Error("Kamida bitta ruxsat tanlang");
      }
      if (edit) {
        const payload: Record<string, unknown> = {
          id: edit.id,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          role: form.role,
          permissions: form.permissions,
        };
        if (form.password.trim()) payload.password = form.password;

        const res = await fetch("/api/platform/staff", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Xatolik");
        if (data.staff) {
          setRows((prev) => prev.map((r) => (r.id === edit.id ? data.staff : r)));
        }
        if (data.password) {
          setRevealedPassword(data.password);
          setForm((prev) => ({ ...prev, password: "" }));
          return;
        }
      } else {
        const res = await fetch("/api/platform/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || undefined,
            password: form.password,
            role: form.role,
            permissions: form.permissions,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Xatolik");
        setRows((prev) => [data.staff, ...prev]);
        if (data.password) {
          setRevealedPassword(data.password);
          setEdit(null);
          setForm(emptyForm);
          return;
        }
      }
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  async function submitStaffPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwStaff || pwSaving) return;
    setPwSaving(true);
    setPwError("");
    setRevealedStaffPassword(null);
    try {
      const res = await fetch("/api/platform/staff", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pwStaff.id, password: staffPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setRevealedStaffPassword(data.password ?? staffPassword);
      setStaffPassword("");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setPwSaving(false);
    }
  }

  async function patchStaff(
    id: string,
    patch: { role?: PlatformStaffRole; isActive?: boolean },
  ) {
    const body: Record<string, unknown> = { id, ...patch };
    if (patch.role) {
      const current = rows.find((r) => r.id === id);
      const next = [...ROLE_PERMISSION_PRESETS[patch.role]] as PlatformPermission[];
      if (current?.permissions.includes("flag.hide_revenue")) {
        next.push("flag.hide_revenue");
      }
      body.permissions = next;
    }
    const res = await fetch("/api/platform/staff", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return;
    if (data.staff) {
      setRows((prev) => prev.map((r) => (r.id === id ? data.staff : r)));
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        let permissions = r.permissions;
        if (patch.role) {
          permissions = [...ROLE_PERMISSION_PRESETS[patch.role]];
          if (r.permissions.includes("flag.hide_revenue")) {
            permissions.push("flag.hide_revenue");
          }
        }
        return {
          ...r,
          role: patch.role ?? r.role,
          isActive: patch.isActive ?? r.isActive,
          permissions,
        };
      }),
    );
  }

  async function deleteStaff(row: PlatformStaffRow) {
    if (!confirm(`${row.name} xodimini o'chirishni xohlaysizmi?`)) return;
    setLoading(true);
    try {
      const res = await fetch("/api/platform/staff", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "O'chirib bo'lmadi");
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  const menuPerms = PLATFORM_PERMISSION_DEFS.filter((p) => p.group === "Menyu");
  const actionPerms = PLATFORM_PERMISSION_DEFS.filter((p) => p.group === "Amallar");
  const privacyPerms = PLATFORM_PERMISSION_DEFS.filter((p) => p.group === "Maxfiylik");

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-500">
          Xodim qo&apos;shganda menyu va amallar ruxsatlarini tanlang. Parolni
          unutgan xodim uchun «Parol» tugmasidan yangilang.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white"
        >
          <UserPlus className="h-4 w-4" />
          Xodim qo&apos;shish
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-stone-100">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-stone-50 text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Ism</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Ruxsatlar</th>
              <th className="px-4 py-3 font-medium">Holat</th>
              <th className="px-4 py-3 font-medium">Amallar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-stone-100">
                <td className="px-4 py-3 font-medium text-stone-900">{r.name}</td>
                <td className="px-4 py-3 text-stone-600">{r.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={r.role}
                    onChange={(e) =>
                      void patchStaff(r.id, {
                        role: e.target.value as PlatformStaffRole,
                      })
                    }
                    className="rounded-lg border border-stone-200 px-2 py-1.5"
                    title="Rolni o'zgartirish — ruxsatlar presetini yangilaydi"
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {PLATFORM_STAFF_ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-stone-500">
                  {r.permissions.length} ta ·{" "}
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="font-semibold text-violet-600 hover:underline"
                  >
                    tahrirlash
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void patchStaff(r.id, { isActive: !r.isActive })}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.isActive
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {r.isActive ? "Faol" : "Nofaol"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEdit(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2 py-1 text-xs font-semibold hover:bg-stone-50"
                    >
                      <Pencil className="h-3 w-3" />
                      Tahrir
                    </button>
                    <button
                      type="button"
                      onClick={() => openStaffPassword(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100"
                    >
                      <KeyRound className="h-3 w-3" />
                      Parol
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void deleteStaff(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      O&apos;chirish
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                  Hali xodim qo&apos;shilmagan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pwStaff && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeStaffPassword}
        >
          <form
            onSubmit={(e) => void submitStaffPassword(e)}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-violet-600" />
              <h2 className="text-lg font-bold text-stone-900">Xodim paroli</h2>
            </div>
            <p className="text-sm text-stone-600">
              <span className="font-semibold text-stone-900">{pwStaff.name}</span>
              {" — "}
              {pwStaff.email}
            </p>
            {!revealedStaffPassword ? (
              <div className="mt-4">
                <PasswordField
                  label="Yangi parol"
                  required
                  minLength={6}
                  value={staffPassword}
                  onChange={setStaffPassword}
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
                    {revealedStaffPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => void copyText(revealedStaffPassword, "modal")}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                  >
                    {pwCopied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Nusxa
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
                onClick={closeStaffPassword}
                disabled={pwSaving}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold"
              >
                {revealedStaffPassword ? "Yopish" : "Bekor"}
              </button>
              {!revealedStaffPassword ? (
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={(e) => void saveStaff(e)}
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-bold text-stone-900">
              {edit ? "Xodimni tahrirlash" : "Platforma xodimi"}
            </h2>
            {revealedPassword ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-800">
                    Parol saqlandi. Xodimga bering:
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="flex-1 break-all rounded-lg bg-white px-3 py-2 font-mono text-sm text-stone-900 ring-1 ring-emerald-100">
                      {revealedPassword}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyText(revealedPassword, "form")}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Nusxa
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Yopish
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <input
                    required
                    placeholder="Ism"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2"
                  />
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2"
                  />
                  <input
                    placeholder="Telefon"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2"
                  />
                  <PasswordField
                    label={edit ? "Yangi parol (ixtiyoriy)" : "Parol"}
                    required={!edit}
                    minLength={6}
                    value={form.password}
                    onChange={(password) => setForm({ ...form, password })}
                    inputClassName="w-full rounded-xl border border-stone-200 px-3 py-2 pr-11"
                  />
                  <label className="block text-xs font-semibold text-stone-500">
                    Rol (preset)
                    <select
                      value={form.role}
                      onChange={(e) => setRole(e.target.value as PlatformStaffRole)}
                      className="mt-1 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-medium text-stone-800"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {PLATFORM_STAFF_ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <p className="text-sm font-extrabold text-stone-800">Menyular</p>
                    <p className="mt-0.5 text-[11px] text-stone-500">
                      Sidebarda qaysi bo&apos;limlar ko&apos;rinsin
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {menuPerms.map((p) => (
                        <label
                          key={p.key}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-800 hover:bg-stone-100"
                        >
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(p.key)}
                            onChange={() => togglePermission(p.key)}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <p className="text-sm font-extrabold text-stone-800">Amallar</p>
                    <div className="mt-2 space-y-1.5">
                      {actionPerms.map((p) => (
                        <label
                          key={p.key}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-800 hover:bg-stone-100"
                        >
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(p.key)}
                            onChange={() => togglePermission(p.key)}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                    <p className="text-sm font-extrabold text-stone-800">Maxfiylik</p>
                    <div className="mt-2 space-y-1.5">
                      {privacyPerms.map((p) => (
                        <label
                          key={p.key}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-stone-800 hover:bg-stone-100"
                        >
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(p.key)}
                            onChange={() => togglePermission(p.key)}
                          />
                          {p.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {error ? (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                ) : null}

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold"
                  >
                    Bekor
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {loading ? "Saqlanmoqda…" : "Saqlash"}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
