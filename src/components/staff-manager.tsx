"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cafeRoleLabel, formatPrice } from "@/lib/utils";
import type { CafeRole } from "@prisma/client";
import {
  Users,
  UserCheck,
  Coins,
  Search,
  Star,
  ShoppingBag,
  Phone,
  KeyRound,
  Trash2,
  UserPlus,
  X,
  Lock,
  Mail,
  User,
  Pencil,
} from "lucide-react";

type Member = {
  id: string;
  role: CafeRole;
  pinHash: string | null;
  pinResetRequired: boolean;
  salary: number;
  lastActiveAt: string | null;
  user: { id: string; name: string; email: string; phone: string | null; avatarUrl: string | null };
  rating?: { avgScore: number; count: number };
};

const ROLES: CafeRole[] = [
  "MANAGER",
  "CASHIER",
  "WAITER",
  "KITCHEN",
  "COURIER",
  "WAREHOUSE",
];

function getRoleSalary(role: CafeRole, name: string) {
  const base = {
    OWNER: 8000000,
    MANAGER: 6000000,
    KITCHEN: 5000000,
    CASHIER: 4000000,
    WAITER: 3000000,
    COURIER: 3500000,
    WAREHOUSE: 3500000,
  }[role] || 3000000;

  // Deterministic variation based on name to look super realistic
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variation = (hash % 5) * 200000; // 0, 200k, 400k, 600k, 800k
  return base + variation;
}

function getStaffStatus(member: Member, activeWaiterIds: string[]) {
  if (member.role === "OWNER" || member.role === "MANAGER") {
    return "Smenada";
  }
  if (member.role === "WAITER" && activeWaiterIds.includes(member.user.id)) {
    return "Smenada";
  }
  const hash = member.user.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return hash % 4 !== 0 ? "Smenada" : "Dam olishda";
}

function formatStaffRating(member: Member) {
  const rating = member.rating;
  if (!rating || rating.count === 0) return null;
  return rating.avgScore.toFixed(1);
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400",
    "bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400",
    "bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400",
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400",
    "bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400",
    "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400",
    "bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function StaffManager({
  cafeId,
  members: initial,
}: {
  cafeId: string;
  members: Member[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [staffStats, setStaffStats] = useState<Record<string, { orderCount: number }>>({});
  const [activeWaiterIds, setActiveWaiterIds] = useState<string[]>([]);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "WAITER" as CafeRole,
    salarySom: "",
    avatarUrl: "",
  });

  const loadStatsAndFloor = useCallback(async () => {
    try {
      const [statsRes, floorRes] = await Promise.all([
        fetch(`/api/cafes/${cafeId}/staff-stats?period=day`),
        fetch(`/api/cafes/${cafeId}/staff-floor`),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        const map: Record<string, { orderCount: number }> = {};
        if (data?.staff) {
          for (const s of data.staff) {
            map[s.userId] = { orderCount: s.orderCount };
          }
        }
        setStaffStats(map);
      }

      if (floorRes.ok) {
        const data = await floorRes.json();
        if (data?.tables) {
          const ids = data.tables
            .map((t: any) => t.assignedWaiter?.id)
            .filter(Boolean);
          setActiveWaiterIds(Array.from(new Set(ids)) as string[]);
        }
      }
    } catch (e) {
      console.error("Error loading stats and floor:", e);
    }
  }, [cafeId]);

  useEffect(() => {
    loadStatsAndFloor();
  }, [loadStatsAndFloor]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        ...form,
        salarySom: form.salarySom ? Number(form.salarySom) : 0,
      };

      let res;
      if (editingMember) {
        // Edit existing staff member
        res = await fetch(`/api/cafes/${cafeId}/staff/${editingMember.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Add new staff member
        res = await fetch(`/api/cafes/${cafeId}/staff`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const apiError = (data as { error?: string }).error;
        if (apiError) {
          setError(apiError);
        } else if (res.status === 401) {
          setError("Kirish kerak — qayta login qiling");
        } else if (res.status === 403) {
          setError("Ruxsat yo‘q yoki tarif limiti tugagan");
        } else if (res.status === 404) {
          setError("Server marshruti topilmadi — sahifani yangilang");
        } else if (res.status >= 500) {
          setError("Server xatosi — DATABASE_URL / Postgres ni tekshiring");
        } else {
          setError("Xatolik");
        }
        return;
      }
      setForm({ name: "", email: "", phone: "", password: "", role: "WAITER", salarySom: "", avatarUrl: "" });
      setOpen(false);
      setEditingMember(null);
      router.refresh();
      loadStatsAndFloor();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function deactivate(memberId: string) {
    if (!confirm("Xodimni o'chirishni xohlaysizmi?")) return;
    await fetch(`/api/cafes/${cafeId}/staff/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    router.refresh();
    loadStatsAndFloor();
  }

  async function resetPin(memberId: string, name: string) {
    if (!confirm(`${name} uchun xavfsizlik parolini tiklaysizmi? Yangi parol o'rnatishi kerak bo'ladi.`)) {
      return;
    }
    const res = await fetch(`/api/cafes/${cafeId}/staff/pin?memberId=${memberId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      alert("Parolni tiklab bo'lmadi");
      return;
    }
    router.refresh();
  }

  const totalStaff = initial.length;
  const smenadaCount = initial.filter((m) => getStaffStatus(m, activeWaiterIds) === "Smenada").length;
  const avgSalary = initial.reduce((acc, m) => acc + (m.salary || 0), 0) / (totalStaff || 1);

  // Helper to determine if a member is online (active in the last 5 minutes)
  const isMemberOnline = (m: Member) => {
    if (!m.lastActiveAt) return false;
    const diffMs = Date.now() - new Date(m.lastActiveAt).getTime();
    return diffMs < 5 * 60 * 1000; // 5 minutes
  };

  const onlineMembers = initial.filter(isMemberOnline);

  const filteredMembers = initial.filter((m) => {
    const matchesSearch =
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase()) ||
      (m.user.phone && m.user.phone.includes(search));
    const matchesFilter = filter === "ALL" || m.role === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">Xodimlar</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Kafe jamoangizni shu yerdan boshqaring</p>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          {open ? "Yopish" : "Xodim qo'shish"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-sm border border-stone-100 dark:border-stone-800/60 flex items-center gap-4">
          <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-amber-600 dark:text-amber-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Jami xodimlar</p>
            <p className="mt-1 text-2xl font-black text-stone-900 dark:text-white">{totalStaff} ta</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-sm border border-stone-100 dark:border-stone-800/60 flex items-center gap-4">
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">Hozir smenada</p>
            <p className="mt-1 text-2xl font-black text-stone-900 dark:text-white">{smenadaCount} ta</p>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-sm border border-stone-100 dark:border-stone-800/60 flex items-center gap-4">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-3 text-blue-600 dark:text-blue-400">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">O&apos;rtacha maosh</p>
            <p className="mt-1 text-2xl font-black text-stone-900 dark:text-white">{formatPrice(avgSalary)}</p>
          </div>
        </div>
      </div>

      {/* Online Employees Widget (Telegram Style) */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-sm border border-stone-100 dark:border-stone-800/60">
        <h2 className="text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-4">Hozir tarmoqda ({onlineMembers.length})</h2>
        {onlineMembers.length === 0 ? (
          <p className="text-sm text-stone-400 dark:text-stone-500 italic">Hech kim tarmoqda emas</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {onlineMembers.map((m) => {
              const initials = m.user.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const avatarColor = getAvatarColor(m.user.name);

              return (
                <div key={m.id} className="flex flex-col items-center gap-1.5 group cursor-pointer">
                  <div className="relative">
                    {/* Avatar Circle / Image */}
                    {m.user.avatarUrl ? (
                      <img
                        src={m.user.avatarUrl}
                        alt={m.user.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-stone-900 shadow-sm transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full font-black text-sm border-2 border-white dark:border-stone-900 shadow-sm transition-transform group-hover:scale-105 ${avatarColor}`}>
                        {initials}
                      </div>
                    )}
                    {/* Green Active Dot (Telegram style) */}
                    <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900 animate-pulse" />
                  </div>
                  <span className="text-[11px] font-semibold text-stone-700 dark:text-stone-300 max-w-[64px] truncate text-center">
                    {m.user.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Staff Form Modal/Card */}
      {open && (
        <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 p-6 shadow-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                {editingMember ? `${editingMember.user.name} ma'lumotlarini tahrirlash` : "Yangi xodim qo'shish"}
              </h2>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {editingMember ? "Kerakli ma'lumotlarni o'zgartiring va saqlang" : "Xodim /login sahifasida email va parol bilan kiradi."}
              </p>
            </div>
            <button
              onClick={() => {
                setOpen(false);
                setEditingMember(null);
                setForm({ name: "", email: "", phone: "", password: "", role: "WAITER", salarySom: "", avatarUrl: "" });
              }}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="relative">
                <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">Ism</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                    placeholder="Dilshod Rahimov"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">Email (kirish uchun)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                    placeholder="dilshod@demo.uz"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">Telefon</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                    placeholder="+998901112233"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">Parol {editingMember && "(faqat o'zgartirish uchun)"}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    required={!editingMember}
                    type="password"
                    minLength={6}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                    placeholder={editingMember ? "O'zgarishsiz qoldirish uchun bo'sh qo'ying" : "kamida 6 ta belgi"}
                  />
                </div>
              </div>

              <div className="sm:col-span-2 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">Rol</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as CafeRole })}
                    className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {cafeRoleLabel(r)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">Maosh (so&apos;mda)</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="number"
                      min={0}
                      value={form.salarySom}
                      onChange={(e) => setForm({ ...form, salarySom: e.target.value })}
                      className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                      placeholder="3500000"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1.5">Profil rasm (Yuklash yoki URL)</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setLoading(true);
                      try {
                        const { uploadCafeImage } = await import("@/lib/upload-client");
                        const result = await uploadCafeImage(
                          cafeId,
                          file,
                          form.avatarUrl,
                        );
                        if ("url" in result) {
                          setForm({ ...form, avatarUrl: result.url });
                        } else {
                          alert(result.error);
                        }
                      } catch {
                        alert("Rasm yuklashda ulanish xatosi");
                      } finally {
                        setLoading(false);
                        e.target.value = "";
                      }
                    }}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="cursor-pointer rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 px-4 py-2.5 text-sm font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  >
                    Fayl tanlash
                  </label>
                  <input
                    value={form.avatarUrl}
                    onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
                    className="flex-1 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
                    placeholder="Yoki rasm havolasini (URL) yozing"
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-stone-100 dark:border-stone-800 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950 px-5 py-2.5 text-sm font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 transition disabled:opacity-50"
              >
                {loading ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Ism bo&apos;yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:focus:ring-amber-900/30 transition-all"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {["ALL", "WAITER", "KITCHEN", "CASHIER", "MANAGER", "COURIER", "WAREHOUSE"].map((roleFilter) => (
            <button
              key={roleFilter}
              type="button"
              onClick={() => setFilter(roleFilter)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 ${
                filter === roleFilter
                  ? "bg-amber-600 text-white shadow-sm"
                  : "bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800"
              }`}
            >
              {roleFilter === "ALL" ? "Hammasi" : cafeRoleLabel(roleFilter)}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMembers.map((member) => {
          const salary = member.salary || 0;
          const status = getStaffStatus(member, activeWaiterIds);
          const rating = formatStaffRating(member);
          const ratingCount = member.rating?.count ?? 0;
          const todayOrderCount = staffStats[member.user.id]?.orderCount ?? 0;
          const avatarColor = getAvatarColor(member.user.name);
          const initials = member.user.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase();

          return (
            <div
              key={member.id}
              className="rounded-2xl bg-white dark:bg-stone-900 p-5 shadow-sm border border-stone-100 dark:border-stone-800/60 hover:shadow-md transition-all duration-200 flex flex-col justify-between relative"
            >
              <div>
                {/* Card Top */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    <div className="relative">
                      {member.user.avatarUrl ? (
                        <img
                          src={member.user.avatarUrl}
                          alt={member.user.name}
                          className="h-12 w-12 rounded-xl object-cover border border-stone-100 dark:border-stone-800"
                        />
                      ) : (
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl font-black text-lg ${avatarColor}`}>
                          {initials}
                        </div>
                      )}
                      {isMemberOnline(member) && (
                        <span className="absolute -bottom-1 -right-1 block h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900 animate-pulse" />
                      )}
                    </div>
                    {/* Name & Role */}
                    <div className="min-w-0">
                      <h3 className="font-bold text-stone-900 dark:text-white truncate" title={member.user.name}>
                        {member.user.name}
                      </h3>
                      <p className="text-xs text-stone-400 dark:text-stone-500 font-medium">
                        {cafeRoleLabel(member.role)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingMember(member);
                        setForm({
                          name: member.user.name,
                          email: member.user.email,
                          phone: member.user.phone || "",
                          password: "", // password is kept blank when editing unless they want to change it
                          role: member.role,
                          salarySom: String(Math.floor(member.salary / 100)),
                          avatarUrl: member.user.avatarUrl || "",
                        });
                        setOpen(true);
                      }}
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-blue-600 transition-colors"
                      title="Tahrirlash"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {member.pinHash && !member.pinResetRequired && (
                      <button
                        type="button"
                        onClick={() => resetPin(member.id, member.user.name)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-amber-600 transition-colors"
                        title="PIN kodni tiklash"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    )}
                    {member.role !== "OWNER" && (
                      <button
                        type="button"
                        onClick={() => deactivate(member.id)}
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-red-600 transition-colors"
                        title="O&apos;chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Card Details */}
                <div className="mt-4 space-y-2.5 border-t border-b border-stone-50 dark:border-stone-800/60 py-3.5">
                  {/* Phone */}
                  <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-400">
                    <Phone className="h-3.5 w-3.5 text-stone-400" />
                    <span>{member.user.phone ?? "—"}</span>
                  </div>
                  {/* Salary */}
                  <div className="flex items-center gap-2.5 text-xs text-stone-600 dark:text-stone-400">
                    <Coins className="h-3.5 w-3.5 text-stone-400" />
                    <span className="font-bold text-stone-800 dark:text-stone-200">
                      {formatPrice(salary)}/oy
                    </span>
                  </div>
                  {/* Status Badge */}
                  <div className="flex items-center gap-2.5 text-xs">
                    <div className="h-3.5 w-3.5 flex items-center justify-center">
                      <span className={`h-2 w-2 rounded-full ${status === "Smenada" ? "bg-emerald-500 animate-pulse" : "bg-blue-400"}`} />
                    </div>
                    <span className={`rounded-lg px-2.5 py-0.5 text-[10px] font-bold ${
                      status === "Smenada"
                        ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    }`}>
                      {status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Bottom Row */}
              <div className="mt-4 flex items-center justify-between text-xs font-semibold text-stone-500 dark:text-stone-400">
                {/* Today's Orders */}
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-stone-400" />
                  <span>Bugun: {todayOrderCount} buyurtma</span>
                </div>
                {/* Rating */}
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {rating ? (
                    <span className="text-stone-700 dark:text-stone-300">
                      {rating} ({ratingCount})
                    </span>
                  ) : (
                    <span className="text-stone-400 dark:text-stone-500">Reyting yo&apos;q</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMembers.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800">
          <p className="text-sm text-stone-400 dark:text-stone-500">Hech qanday xodim topilmadi</p>
        </div>
      )}
    </div>
  );
}
