"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { pickLocalizedDescription, pickLocalizedName } from "@/lib/menu-i18n";
import { getMenuUiLabels } from "@/lib/menu-ui-labels";
import type { MenuFoodTagId } from "@/lib/menu-food-tags";
import { ProductMenuImage } from "@/components/product-menu-image";
import { CustomerMenuHeader } from "@/components/customer-menu-header";
import { MenuTagFilterBar } from "@/components/menu-tag-filter-bar";
import { CustomerCafeBlockedNotice } from "@/components/customer-cafe-blocked-notice";
import { InstallAppButton } from "@/components/install-app-button";
import { useMenuLocale } from "@/hooks/use-menu-locale";
import type { CafeBlockReason } from "@/lib/cafe-public-access";

type MenuProduct = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  price: number;
  imageUrl: string | null;
  menuTag?: string | null;
};

type MenuCategory = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  products: MenuProduct[];
};

export function CustomerMenuLanding({
  slug,
  cafeName,
  address,
  logoUrl,
  social,
  menuPrimaryColor,
  categories,
  blocked = null,
}: {
  slug: string;
  cafeName: string;
  address?: string | null;
  logoUrl?: string | null;
  social?: {
    instagram?: string | null;
    telegram?: string | null;
    facebook?: string | null;
  };
  menuPrimaryColor?: string | null;
  categories: MenuCategory[];
  blocked?: CafeBlockReason | null;
}) {
  const { locale, setLocale } = useMenuLocale(slug);
  const ui = getMenuUiLabels(locale);
  const color = menuPrimaryColor ?? "#d97706";
  const [activeTag, setActiveTag] = useState<MenuFoodTagId | null>(null);

  const filteredCategories = useMemo(() => {
    if (!activeTag) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter((p) => p.menuTag === activeTag),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, activeTag]);

  return (
    <div className="min-h-[100dvh] bg-stone-50">
      <CustomerMenuHeader
        cafeName={cafeName}
        logoUrl={logoUrl}
        social={social}
        menuPrimaryColor={color}
        locale={locale}
        onLocaleChange={setLocale}
        subtitle={
          address ? <p className="mt-1 text-sm text-white/80">{address}</p> : undefined
        }
      />

      <main className="mx-auto max-w-lg px-4 py-6">
        {blocked && (
          <div className="mb-6">
            <CustomerCafeBlockedNotice reason={blocked} locale={locale} />
          </div>
        )}

        {!blocked ? (
          <InstallAppButton
            href={`/c/${slug}/app`}
            label={
              locale === "ru"
                ? "Скачать приложение"
                : locale === "en"
                  ? "Download app"
                  : "Ilovani yuklab olish"
            }
            color={color}
            className="mb-4"
          />
        ) : null}

        <div className="mb-6 grid grid-cols-2 gap-3">
          {blocked ? (
            <>
              <div className="rounded-xl border border-stone-200 bg-stone-100 py-4 text-center text-stone-500">
                <span className="font-semibold">{ui.onlineOrder}</span>
                <p className="mt-1 text-xs">{ui.onlineOrderSub}</p>
                <p className="mt-2 text-xs font-medium text-red-600">
                  {locale === "ru"
                    ? "Временно недоступно"
                    : locale === "en"
                      ? "Temporarily unavailable"
                      : "Vaqtincha o'chirilgan"}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-100 py-4 text-center text-stone-500">
                <span className="font-semibold">{ui.atTable}</span>
                <p className="mt-1 text-xs text-stone-400">
                  {locale === "ru"
                    ? "Заказ со стола отключен"
                    : locale === "en"
                      ? "Table ordering disabled"
                      : "Stol buyurtmasi o'chirilgan"}
                </p>
              </div>
            </>
          ) : (
            <>
              <Link
                href={`/c/${slug}/app`}
                className="rounded-xl border border-stone-200 bg-white py-4 text-center shadow-sm"
              >
                <span className="font-semibold text-stone-900">{ui.onlineOrder}</span>
                <p className="mt-1 text-xs text-stone-500">{ui.onlineOrderSub}</p>
              </Link>
              <div className="rounded-xl bg-white py-4 text-center shadow-sm ring-1 ring-stone-100">
                <span className="font-semibold text-stone-900">{ui.atTable}</span>
                <p className="mt-1 text-xs text-stone-400">{ui.atTableSub}</p>
              </div>
            </>
          )}
        </div>

        {!blocked && (
        <div className="mb-6 rounded-xl border border-dashed border-stone-300 bg-white p-5 text-center shadow-sm">
          <p className="text-4xl">📷</p>
          <h2 className="mt-2 font-semibold text-stone-900">{ui.scanQrHint}</h2>
          <p className="mt-2 text-sm leading-relaxed text-stone-500">{ui.scanQrDetail}</p>
        </div>
        )}

        <MenuTagFilterBar
          locale={locale}
          activeTag={activeTag}
          onChange={setActiveTag}
          className="mb-6"
        />

        <div className="space-y-6">
          {filteredCategories.map((cat) => (
            <section key={cat.id}>
              <h2 className="mb-3 text-lg font-semibold text-stone-800">
                {pickLocalizedName(cat, locale)}
              </h2>
              <div className="space-y-2">
                {cat.products.map((product) => {
                  const name = pickLocalizedName(product, locale);
                  const description = pickLocalizedDescription(product, locale);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
                    >
                      <ProductMenuImage
                        url={product.imageUrl}
                        name={name}
                        menuTag={product.menuTag}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-stone-900">{name}</p>
                        {description && (
                          <p className="line-clamp-2 text-xs text-stone-400">{description}</p>
                        )}
                      </div>
                      <p className="shrink-0 font-semibold" style={{ color }}>
                        {formatPrice(product.price)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
