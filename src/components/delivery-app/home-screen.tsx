"use client";

import { useState } from "react";
import { Heart, MapPin, Search } from "lucide-react";
import { pickLocalizedName } from "@/lib/menu-i18n";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";
import { formatPrice } from "@/lib/utils";
import { AddressPickerModal } from "./address-picker-modal";
import {
  buildHomeOfferCards,
  DeliveryHomePromoGrid,
} from "./home-promo-grid";
import { BAEMIN_TEAL, BAEMIN_TEAL_DEEP, DA_INK, DA_MUTED } from "./theme";
import type {
  DeliveryCategory,
  DeliveryOrderType,
  DeliveryProduct,
  DeliveryPromo,
} from "./types";

function firstName(full: string) {
  const t = full.trim();
  if (!t) return "mehmon";
  return t.split(/\s+/)[0] ?? t;
}

export function DeliveryHomeScreen({
  cafeName,
  logoUrl,
  primaryColor,
  customerName,
  locale,
  orderType,
  deliveryEnabled,
  address,
  savedAddresses = [],
  search,
  categories,
  cartCount,
  minOrderAmountSom,
  deliveryFeeSom,
  promos = [],
  notices = [],
  favoriteIds = [],
  onToggleFavorite,
  onOrderTypeChange,
  onAddressChange,
  onAddressDelete,
  onSearchChange,
  onOpenCart,
  onOpenCategory,
  onOpenSearch,
  onOpenProfile,
  onOpenPromo,
  onOpenProduct,
}: {
  cafeName: string;
  logoUrl?: string | null;
  primaryColor: string;
  customerName?: string;
  locale: MenuLocale;
  orderType: DeliveryOrderType;
  deliveryEnabled: boolean;
  address: string;
  savedAddresses?: string[];
  search: string;
  categories: DeliveryCategory[];
  cartCount: number;
  minOrderAmountSom: number;
  deliveryFeeSom: number;
  deliveryTimeMinutes?: number;
  promos?: DeliveryPromo[];
  notices?: { id: string; title: string; body: string; priority: string; createdAt: Date | string }[];
  favoriteIds?: string[];
  onToggleFavorite?: (productId: string) => void;
  onOrderTypeChange: (t: DeliveryOrderType) => void;
  onAddressChange: (v: string, geo?: { lat: number; lng: number }) => void;
  onAddressDelete?: (address: string) => void;
  onSearchChange: (v: string) => void;
  onOpenCart: () => void;
  onOpenCategory: (categoryId: string) => void;
  onOpenSearch: () => void;
  onOpenProfile?: () => void;
  onOpenPromo?: (promo: DeliveryPromo) => void;
  onOpenProduct?: (product: DeliveryProduct, categoryId: string) => void;
}) {
  const [addressOpen, setAddressOpen] = useState(false);
  const foodImages = categories
    .flatMap((c) => c.products.map((p) => p.imageUrl).filter(Boolean))
    .filter((u): u is string => Boolean(u))
    .slice(0, 6);

  const offerCards = buildHomeOfferCards({
    promos,
    deliveryEnabled,
    deliveryFeeSom,
    minOrderAmountSom,
    cafeName,
    foodImages,
  });

  const recommended = categories
    .flatMap((c) =>
      c.products.filter((p) => p.isAvailable).map((p) => ({ ...p, categoryId: c.id })),
    )
    .slice(0, 4);

  const ui = getDeliveryUiLabels(locale);
  const greeting = customerName ? firstName(customerName) : ui.greetingGuest;

  return (
    <div className="relative min-h-[100dvh] px-4 pb-6 pt-5">
      {/* soft glass blobs */}
      <div
        className="pointer-events-none absolute -left-16 top-10 h-52 w-52 rounded-full opacity-40 blur-3xl"
        style={{ background: BAEMIN_TEAL }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-10 top-40 h-44 w-44 rounded-full bg-sky-200/40 blur-3xl"
        aria-hidden
      />

      {/* Top Header Card */}
      <div className="relative z-[1] -mx-4 -mt-5 mb-5 bg-gradient-to-b from-teal-50/90 via-teal-50/40 to-transparent px-4 pb-5 pt-6">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[14px] font-bold text-teal-700/80">
              {ui.salom}, {greeting}
            </p>
            <h1
              className="mt-1 max-w-[14rem] text-[24px] font-black leading-tight tracking-tight text-stone-900"
            >
              {ui.todayQuestion}
            </h1>
          </div>
          <button
            type="button"
            onClick={onOpenProfile}
            className="shrink-0 overflow-hidden rounded-full bg-white p-0.5 shadow-md ring-2 ring-teal-100 transition active:scale-95"
            aria-label="Profil"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <span
                className="grid h-12 w-12 place-items-center rounded-full text-sm font-black text-white"
                style={{ background: BAEMIN_TEAL }}
              >
                {cafeName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </button>
        </header>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              if (orderType === "DELIVERY") {
                setAddressOpen(true);
                return;
              }
              const next = window.prompt(ui.takeawayNotesTitle, address);
              if (next != null) onAddressChange(next.trim());
            }}
            className="da-address-chip inline-flex max-w-[min(100%,16rem)] items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-[12px] font-bold shadow-sm transition active:scale-95"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 opacity-90" />
            <span className="truncate">
              {orderType === "DELIVERY"
                ? address || ui.enterAddress
                : ui.takeawayPrompt}
            </span>
          </button>

          <div className="flex gap-1.5">
            {(
              [
                ["DELIVERY", ui.delivery],
                ["TAKEAWAY", ui.takeaway],
              ] as const
            ).map(([key, label]) => {
              if (key === "DELIVERY" && !deliveryEnabled) return null;
              const active = orderType === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onOrderTypeChange(key)}
                  className={`rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition-all duration-200 ${
                    active
                      ? "text-white shadow-sm"
                      : "bg-white/80 text-stone-500 ring-1 ring-stone-200/50 hover:bg-white"
                  }`}
                  style={active ? { background: BAEMIN_TEAL } : undefined}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <label className="da-search-bar relative z-[1] mt-4 flex items-center gap-2.5 rounded-[22px] px-4 py-3.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-teal-400/40">
        <Search className="h-[18px] w-[18px] shrink-0" style={{ color: DA_MUTED }} />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onOpenSearch();
          }}
          placeholder={ui.searchPlaceholder(cafeName)}
          className="da-search-input min-w-0 flex-1 bg-transparent text-[14px] font-semibold outline-none"
          style={{ color: DA_INK }}
        />
      </label>

      {notices && notices.length > 0 && (
        <div className="da-announcements relative z-[1] mt-4 overflow-hidden rounded-2xl border-2 p-4 shadow-[0_8px_20px_rgba(245,158,11,0.05)]">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <span className="flex h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              {ui.announcementsTitle}
            </span>
          </div>
          <div className="mt-1.5 space-y-2.5 divide-y divide-amber-200/40 dark:divide-amber-500/20">
            {notices.map((n, idx) => (
              <div key={n.id} className={idx > 0 ? "pt-2" : ""}>
                <p
                  className="text-[13px] font-extrabold leading-snug"
                  style={{ color: DA_INK }}
                >
                  {n.title}
                </p>
                <p
                  className="mt-0.5 text-[12px] leading-relaxed"
                  style={{ color: DA_MUTED }}
                >
                  {n.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative z-[1] -mx-1 mt-5 mb-6">
        <DeliveryHomePromoGrid
          cards={offerCards}
          primaryColor={primaryColor || BAEMIN_TEAL}
          onOpen={(card) => {
            if (card.productId) {
              const cat = categories.find((c) =>
                c.products.some((p) => p.id === card.productId)
              );
              const prod = cat?.products.find((p) => p.id === card.productId);
              if (prod && cat) {
                onOpenProduct?.(prod, cat.id);
                return;
              }
            }
            onOpenPromo?.(card);
          }}
        />
      </div>

      <section className="relative z-[1] mt-2">
        <div className="mb-3 flex items-center justify-between px-0.5">
          <h2 className="text-[17px] font-extrabold" style={{ color: DA_INK }}>
            {ui.categoriesTitle}
          </h2>
          <button
            type="button"
            className="text-[12px] font-bold"
            style={{ color: DA_MUTED }}
            onClick={() => onOpenCategory("")}
          >
            {ui.allCategories}
          </button>
        </div>

        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm" style={{ color: DA_MUTED }}>
            {ui.menuEmpty}
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => {
              const name = pickLocalizedName(cat, locale);
              const thumb =
                cat.products.find((p) => p.imageUrl)?.imageUrl ?? null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onOpenCategory(cat.id)}
                  className="group flex w-[72px] shrink-0 flex-col items-center gap-2 focus:outline-none"
                >
                  <span className="grid h-[64px] w-[64px] place-items-center overflow-hidden rounded-[22px] bg-white shadow-[0_6px_16px_rgba(0,0,0,0.06)] border border-stone-300/70 group-hover:border-teal-400 group-hover:scale-105 transition-all duration-300">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span
                        className="text-lg font-black"
                        style={{ color: BAEMIN_TEAL_DEEP }}
                      >
                        {name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                  <span
                    className="line-clamp-2 max-w-[72px] text-center text-[11px] font-bold leading-tight group-hover:text-teal-600 transition-colors"
                    style={{ color: DA_INK }}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="relative z-[1] mt-6">
        <div className="mb-4 flex items-center justify-between px-0.5">
          <h2 className="text-[17px] font-extrabold" style={{ color: DA_INK }}>
            {ui.recommendedTitle}
          </h2>
          <button
            type="button"
            className="text-[12px] font-bold"
            style={{ color: DA_MUTED }}
            onClick={() => onOpenCategory("")}
          >
            {ui.moreLabel}
          </button>
        </div>

        {recommended.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: DA_MUTED }}>
            {ui.noRecommendations}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {recommended.map((product) => {
              const name = pickLocalizedName(product, locale);
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() =>
                    onOpenProduct
                      ? onOpenProduct(product, product.categoryId)
                      : onOpenCategory(product.categoryId)
                  }
                  className="group relative text-left focus:outline-none"
                >
                  <div className="relative flex flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_12px_28px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.02)] border border-stone-300/70 group-hover:border-teal-400/60 group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.09)] transition-all duration-300">
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <span
                          className="grid h-full w-full place-items-center text-2xl font-black"
                          style={{ background: `${BAEMIN_TEAL}33`, color: DA_INK }}
                        >
                          {name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {product.discountPrice ? (
                        <span className="absolute top-2 right-2 z-[2] flex h-6 px-1.5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-md ring-2 ring-white">
                          -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-col gap-2 px-3.5 pb-4 pt-3">
                    <div className="flex items-start justify-between gap-1">
                      <p
                        className="line-clamp-2 min-w-0 flex-1 text-[13px] font-extrabold leading-snug"
                        style={{ color: DA_INK }}
                      >
                        {name}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(product.id);
                        }}
                        className="mt-0.5 shrink-0 p-1 -m-1 focus:outline-none"
                        aria-label="Sevimlilarga qo'shish"
                      >
                        <Heart
                          className={`h-4.5 w-4.5 transition-all duration-300 ${
                            favoriteIds.includes(product.id)
                              ? "fill-red-500 text-red-500 scale-110"
                              : "text-stone-300 hover:text-stone-400"
                          }`}
                          strokeWidth={2.2}
                        />
                      </button>
                    </div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      {product.discountPrice ? (
                        <>
                          <span className="text-[14px] font-black text-red-600">
                            {formatPrice(product.discountPrice)}
                          </span>
                          <span className="text-[11px] font-medium text-stone-400 line-through">
                            {formatPrice(product.price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[14px] font-black" style={{ color: DA_INK }}>
                          {formatPrice(product.price)}
                        </span>
                      )}
                    </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {cartCount > 0 ? (
        <p className="sr-only">Savatda {cartCount} ta</p>
      ) : null}

      <AddressPickerModal
        open={addressOpen}
        locale={locale}
        selected={address}
        addresses={savedAddresses}
        onClose={() => setAddressOpen(false)}
        onSelect={onAddressChange}
        onAdd={onAddressChange}
        onDelete={onAddressDelete}
      />
    </div>
  );
}
