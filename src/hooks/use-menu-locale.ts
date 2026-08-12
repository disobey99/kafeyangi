"use client";

import { useEffect, useState } from "react";
import { parseMenuLocale, type MenuLocale } from "@/lib/menu-i18n";

const storageKey = (slug: string) => `menu-locale-${slug}`;

function readStoredLocale(slug: string): MenuLocale {
  if (typeof window === "undefined") return "uz";
  return parseMenuLocale(localStorage.getItem(storageKey(slug)));
}

export function useMenuLocale(slug: string) {
  const [locale, setLocaleState] = useState<MenuLocale>(() => readStoredLocale(slug));

  useEffect(() => {
    setLocaleState(readStoredLocale(slug));
  }, [slug]);

  function setLocale(next: MenuLocale) {
    setLocaleState(next);
    localStorage.setItem(storageKey(slug), next);
  }

  return { locale, setLocale };
}
