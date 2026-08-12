"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Heart, X, ArrowRight } from "lucide-react";
import type { MenuLocale } from "@/lib/menu-i18n";
import type { DeliveryCategory, DeliveryProduct } from "./types";
import { pickLocalizedName } from "@/lib/menu-i18n";
import { formatPrice } from "@/lib/utils";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";
import { BAEMIN_TEAL } from "./theme";

function useDeliveryThemeVars(open: boolean) {
  const [vars, setVars] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const root = document.querySelector(".delivery-app-root");
    if (!(root instanceof HTMLElement)) return;
    const cs = getComputedStyle(root);
    setVars({
      ["--da-card"]: cs.getPropertyValue("--da-card").trim() || "#f4f6f7",
      ["--da-ink"]: cs.getPropertyValue("--da-ink").trim() || "#1a1d26",
      ["--da-muted"]: cs.getPropertyValue("--da-muted").trim() || "#6b7280",
      ["--da-border"]: cs.getPropertyValue("--da-border").trim() || "rgba(26,29,38,0.08)",
      ["--da-input"]: cs.getPropertyValue("--da-input").trim() || "#eef1f3",
      ["--da-accent"]: cs.getPropertyValue("--da-accent").trim() || BAEMIN_TEAL,
    } as React.CSSProperties);
  }, [open]);

  return vars;
}

export function DeliveryFavoritesModal({
  favoriteIds,
  categories,
  locale,
  primaryColor,
  onClose,
  onToggleFavorite,
  onOpenProduct,
}: {
  favoriteIds: string[];
  categories: DeliveryCategory[];
  locale: MenuLocale;
  primaryColor: string;
  onClose: () => void;
  onToggleFavorite: (productId: string) => void;
  onOpenProduct: (product: DeliveryProduct, categoryId: string) => void;
}) {
  const ui = getDeliveryUiLabels(locale);
  const [mounted, setMounted] = useState(false);
  const themeVars = useDeliveryThemeVars(true);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const items = categories
    .flatMap((c) => c.products.map((p) => ({ ...p, categoryId: c.id })))
    .filter((p) => favoriteIds.includes(p.id));

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
      style={themeVars}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/55" />
      <div
        className="relative z-[1] flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] border shadow-2xl"
        style={{
          background: "var(--da-card)",
          borderColor: "var(--da-border)",
          color: "var(--da-ink)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--da-border)" }}
        >
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-red-500 text-red-500" />
            <h2 className="text-base font-extrabold">{ui.favoritesTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full transition"
            style={{ background: "var(--da-input)", color: "var(--da-muted)" }}
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div
                className="mb-4 flex h-16 w-16 items-center justify-center rounded-full shadow-sm"
                style={{
                  background: "color-mix(in srgb, #ef4444 16%, var(--da-card))",
                  color: "#f87171",
                }}
              >
                <Heart className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-extrabold">{ui.noFavoritesYet}</h3>
              <p
                className="mt-1 max-w-[200px] text-xs leading-relaxed"
                style={{ color: "var(--da-muted)" }}
              >
                {ui.favoritesHint}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((product) => {
                const name = pickLocalizedName(product, locale);
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-sm"
                    style={{
                      background: "var(--da-input)",
                      borderColor: "var(--da-border)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProduct(product, product.categoryId);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-12 w-12 rounded-xl object-cover"
                        />
                      ) : (
                        <span
                          className="grid h-12 w-12 place-items-center rounded-xl text-xs font-black"
                          style={{ background: `${primaryColor}22`, color: primaryColor }}
                        >
                          {name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-extrabold">{name}</p>
                        <p className="mt-0.5 text-[11px] font-bold" style={{ color: "var(--da-muted)" }}>
                          {product.discountPrice ? (
                            <span className="mr-1.5 font-extrabold text-red-500">
                              {formatPrice(product.discountPrice)}
                            </span>
                          ) : null}
                          <span
                            className={
                              product.discountPrice
                                ? "text-[10px] font-normal line-through opacity-70"
                                : ""
                            }
                          >
                            {formatPrice(product.price)}
                          </span>
                        </p>
                      </div>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(ui.confirmRemove(name))) {
                            onToggleFavorite(product.id);
                          }
                        }}
                        className="rounded-xl p-2 text-red-500 transition"
                        title={ui.removeFromFavorites}
                      >
                        <Heart className="h-4.5 w-4.5 fill-red-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenProduct(product, product.categoryId);
                        }}
                        className="rounded-xl p-2 transition"
                        style={{ color: "var(--da-muted)" }}
                        title={ui.orderNow}
                      >
                        <ArrowRight className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
