"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Branch = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  isMainBranch: boolean;
  status: string;
};

type Group = {
  id: string;
  name: string;
  slug: string;
};

export function BranchesManager({
  cafeId,
  activeCafeId,
}: {
  cafeId: string;
  activeCafeId: string;
}) {
  const [group, setGroup] = useState<Group | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [branchForm, setBranchForm] = useState({
    name: "",
    slug: "",
    address: "",
    phone: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cafes/${cafeId}/branches`);
    const data = await res.json();
    setGroup(data.group);
    setBranches(data.branches ?? []);
    setLoading(false);
  }, [cafeId]);

  useEffect(() => {
    load();
  }, [load]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/cafes/${cafeId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_group", name: groupName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Xatolik");
      return;
    }
    setGroupName("");
    load();
  }

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch(`/api/cafes/${cafeId}/branches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_branch",
        ...branchForm,
        slug: branchForm.slug || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Xatolik");
      return;
    }
    setBranchForm({ name: "", slug: "", address: "", phone: "" });
    load();
  }

  if (loading) return <p className="text-[var(--dp-muted)]">Yuklanmoqda...</p>;

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</p>
      )}

      {!group ? (
        <section className="rounded-xl bg-[var(--dp-card)] p-6 shadow-sm">
          <h2 className="font-semibold text-[var(--dp-text)]">Tarmoq yaratish</h2>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            Bir nechta filialni bitta tarmoq ostida boshqaring
          </p>
          <form onSubmit={createGroup} className="mt-4 flex gap-2">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Tarmoq nomi, masalan: Demo Kafe"
              className="input flex-1 text-sm"
              required
            />
            <button
              type="submit"
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white"
            >
              Yaratish
            </button>
          </form>
        </section>
      ) : (
        <>
          <div className="rounded-xl bg-[var(--dp-accent-soft)] p-4 ring-1 ring-[var(--dp-stat-amber-border)]">
            <p className="font-semibold text-[var(--dp-text)]">{group.name}</p>
            <p className="text-sm text-[var(--dp-accent)]">/{group.slug}</p>
          </div>

          <section className="rounded-xl bg-[var(--dp-card)] p-6 shadow-sm">
            <h2 className="font-semibold text-[var(--dp-text)]">Filiallar</h2>
            <ul className="mt-4 space-y-2">
              {branches.map((b) => (
                <li
                  key={b.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
                    b.id === activeCafeId
                      ? "border-[var(--dp-accent)] bg-[var(--dp-accent-soft)]"
                      : "border-[var(--dp-border)]"
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      {b.name}
                      {b.isMainBranch && (
                        <span className="ml-2 text-xs text-amber-600">(Asosiy)</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--dp-muted)]">/{b.slug}</p>
                    {b.address && (
                      <p className="text-xs text-[var(--dp-muted)]">{b.address}</p>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/${b.id}/menu`}
                    className="text-sm text-amber-600 hover:underline"
                  >
                    Boshqarish
                  </Link>
                </li>
              ))}
            </ul>
            {activeCafeId !== branches.find((b) => b.isMainBranch)?.id && (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Asosiy filial menyusini bu filialga nusxalaysizmi?")) return;
                  const res = await fetch(`/api/cafes/${activeCafeId}/branches/sync-menu`, {
                    method: "POST",
                  });
                  const data = await res.json();
                  if (!res.ok) alert(data.error || "Xatolik");
                  else alert(`Menyu sinxronlandi: ${data.syncedFrom}`);
                }}
                className="mt-4 rounded-lg border border-[var(--dp-accent)] bg-[var(--dp-accent-soft)] px-4 py-2 text-sm font-medium text-[var(--dp-accent)]"
              >
                Asosiy filial menyusini sinxronlash
              </button>
            )}
          </section>

          <section className="rounded-xl bg-[var(--dp-card)] p-6 shadow-sm">
            <h2 className="font-semibold text-[var(--dp-text)]">Yangi filial qo&apos;shish</h2>
            <form onSubmit={addBranch} className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={branchForm.name}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, name: e.target.value })
                }
                placeholder="Filial nomi"
                className="input text-sm"
                required
              />
              <input
                value={branchForm.slug}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, slug: e.target.value })
                }
                placeholder="URL (ixtiyoriy)"
                className="input text-sm"
              />
              <input
                value={branchForm.address}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, address: e.target.value })
                }
                placeholder="Manzil"
                className="input text-sm sm:col-span-2"
              />
              <input
                value={branchForm.phone}
                onChange={(e) =>
                  setBranchForm({ ...branchForm, phone: e.target.value })
                }
                placeholder="Telefon"
                className="input text-sm sm:col-span-2"
              />
              <button
                type="submit"
                className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white sm:col-span-2"
              >
                Filial qo&apos;shish
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
