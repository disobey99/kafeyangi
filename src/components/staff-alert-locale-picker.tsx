"use client";

import { useEffect, useState } from "react";
import {
  alertLocaleLabels,
  getStaffAlertLocale,
  setStaffAlertLocale,
  type StaffAlertLocale,
} from "@/lib/staff-alert-locale";

const LOCALES = Object.keys(alertLocaleLabels()) as StaffAlertLocale[];

export function StaffAlertLocalePicker({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [locale, setLocale] = useState<StaffAlertLocale>("uz");
  const labels = alertLocaleLabels();

  useEffect(() => {
    setLocale(getStaffAlertLocale());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ locale: StaffAlertLocale }>).detail;
      if (detail?.locale) setLocale(detail.locale);
    };
    window.addEventListener("kafe:alert-locale", onChange);
    return () => window.removeEventListener("kafe:alert-locale", onChange);
  }, []);

  return (
    <div className={className}>
      {!compact && (
        <p className="mb-1.5 text-xs font-medium text-stone-500 dark:text-stone-400">
          Ovoz / bildirishnoma tili
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              setStaffAlertLocale(l);
              setLocale(l);
            }}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              locale === l
                ? "bg-amber-600 text-white"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
            }`}
          >
            {labels[l]}
          </button>
        ))}
      </div>
    </div>
  );
}
