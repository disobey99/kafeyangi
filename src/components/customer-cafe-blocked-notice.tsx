"use client";

import { Ban, CircleAlert } from "lucide-react";
import {
  getCafeBlockedCopy,
  type CafeBlockReason,
} from "@/lib/cafe-public-access";
import type { MenuLocale } from "@/lib/menu-i18n";

export function CustomerCafeBlockedNotice({
  reason,
  locale = "uz",
  accent = "#dc2626",
  compact = false,
}: {
  reason: CafeBlockReason;
  locale?: MenuLocale;
  accent?: string;
  compact?: boolean;
}) {
  const copy = getCafeBlockedCopy(reason, locale);

  return (
    <section
      className={`rounded-2xl border border-red-200 bg-red-50 shadow-sm ${
        compact ? "p-4" : "p-5"
      }`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: accent }}
        >
          {reason === "SUSPENDED" ? (
            <Ban className="h-5 w-5" strokeWidth={2.25} />
          ) : (
            <CircleAlert className="h-5 w-5" strokeWidth={2.25} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-red-900">{copy.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-red-800/90">{copy.message}</p>
          <ul className={`mt-3 space-y-1.5 ${compact ? "text-xs" : "text-sm"} text-red-900/85`}>
            {copy.restrictions.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
