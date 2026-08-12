"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useOffline } from "@/hooks/use-offline";

export function OfflineBanner() {
  const { online, pendingCount } = useOffline();

  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        online
          ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-[var(--brand)]/30 bg-[var(--brand-muted)] text-[var(--foreground)]"
      }`}
    >
      {online ? (
        <Wifi className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
      )}
      <div>
        {!online ? (
          <>
            <p className="font-semibold">Offline rejim</p>
            <p className="mt-1 text-[var(--muted)]">
              Internet yo&apos;q. Oxirgi saqlangan ma&apos;lumotlar ko&apos;rsatiladi.
              Amallar navbatga qo&apos;yiladi va ulanish tiklanganda yuboriladi.
            </p>
          </>
        ) : pendingCount > 0 ? (
          <>
            <p className="font-semibold">Sinxronlanmoqda...</p>
            <p className="mt-1 text-[var(--muted)]">
              {pendingCount} ta kutilayotgan amal yuborilmoqda
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
