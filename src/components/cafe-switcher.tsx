"use client";

import { useRouter, usePathname } from "next/navigation";

type CafeOption = {
  id: string;
  name: string;
  group?: { name: string } | null;
};

export function CafeSwitcher({
  cafes,
  activeCafeId,
  variant = "default",
}: {
  cafes: CafeOption[];
  activeCafeId?: string;
  variant?: "default" | "dashboard";
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (cafes.length <= 1) return null;

  const isDashboard = variant === "dashboard";

  function switchCafe(newId: string) {
    if (!pathname) return;
    const parts = pathname.split("/");
    const dashIdx = parts.indexOf("dashboard");
    if (dashIdx >= 0 && parts[dashIdx + 1]) {
      parts[dashIdx + 1] = newId;
      router.push(parts.join("/"));
      return;
    }
    router.push(`/dashboard/${newId}/menu`);
  }

  if (isDashboard) {
    return (
      <div
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--dp-sidebar-border)" }}
      >
        <label className="text-xs font-medium text-[var(--dp-sidebar-muted)]">Filial</label>
        <select
          value={activeCafeId ?? cafes[0]?.id}
          onChange={(e) => switchCafe(e.target.value)}
          className="mt-1.5 w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-orange-500/25"
          style={{
            borderColor: "var(--dp-border)",
            background: "var(--dp-input-bg)",
            color: "var(--dp-input-fg)",
          }}
        >
          {cafes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.group ? ` (${c.group.name})` : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="border-b border-stone-200 px-4 py-3">
      <label className="text-xs font-medium text-stone-400">Filial</label>
      <select
        value={activeCafeId ?? cafes[0]?.id}
        onChange={(e) => switchCafe(e.target.value)}
        className="mt-1 w-full rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
      >
        {cafes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.group ? ` (${c.group.name})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
