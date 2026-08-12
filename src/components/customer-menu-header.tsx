"use client";

import { CircleFadingArrowUp, Send } from "lucide-react";
import { FaInstagram } from "react-icons/fa6";
import { MenuLocaleSwitcher } from "@/components/menu-locale-switcher";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getMenuUiLabels } from "@/lib/menu-ui-labels";

type SocialLinks = {
  instagram?: string | null;
  telegram?: string | null;
  facebook?: string | null;
};

function normalizeSocialUrl(kind: "instagram" | "telegram" | "facebook", raw?: string | null) {
  const value = (raw ?? "").trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (kind === "telegram") return `https://t.me/${value.replace(/^@/, "")}`;
  if (kind === "instagram") return `https://instagram.com/${value.replace(/^@/, "")}`;
  return `https://facebook.com/${value}`;
}

export function CustomerMenuHeader({
  cafeName,
  logoUrl,
  social,
  menuPrimaryColor = "#d97706",
  subtitle,
  locale,
  onLocaleChange,
}: {
  cafeName: string;
  logoUrl?: string | null;
  social?: SocialLinks;
  menuPrimaryColor?: string;
  subtitle?: React.ReactNode;
  locale: MenuLocale;
  onLocaleChange: (l: MenuLocale) => void;
}) {
  const ui = getMenuUiLabels(locale);
  const instagram = normalizeSocialUrl("instagram", social?.instagram);
  const telegram = normalizeSocialUrl("telegram", social?.telegram);
  const facebook = normalizeSocialUrl("facebook", social?.facebook);
  return (
    <header
      className="px-4 py-5 text-white"
      style={{ backgroundColor: menuPrimaryColor }}
    >
      <div className="mx-auto flex max-w-lg items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl && (
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold">{cafeName}</h1>
            {subtitle}
            {(instagram || telegram || facebook) && (
              <div className="mt-2 flex items-center gap-1.5">
                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                    aria-label="Instagram"
                  >
                    <FaInstagram className="h-3.5 w-3.5" />
                  </a>
                )}
                {telegram && (
                  <a
                    href={telegram}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                    aria-label="Telegram"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </a>
                )}
                {facebook && (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                    aria-label="Facebook"
                  >
                    <CircleFadingArrowUp className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
        <MenuLocaleSwitcher
          locale={locale}
          onChange={onLocaleChange}
          showLabel
          label={ui.lang}
        />
      </div>
    </header>
  );
}
