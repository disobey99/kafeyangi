"use client";

import { X } from "lucide-react";
import type { DeliveryPromo } from "./types";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";

export function DeliveryPromoModal({
  cafeName,
  promo,
  locale,
  onClose,
  onCta,
}: {
  cafeName: string;
  primaryColor?: string;
  promo: DeliveryPromo;
  locale: MenuLocale;
  onClose: () => void;
  onCta: () => void;
}) {
  const ui = getDeliveryUiLabels(locale);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-[28px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="absolute right-3 top-3 z-[2] grid h-9 w-9 place-items-center rounded-full bg-black/25 text-white"
          onClick={onClose}
          aria-label="Yopish"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="bg-gradient-to-br from-[#FF8A3D] via-[#FF6B2C] to-[#E85D04] px-5 pb-7 pt-9 text-white">
          <p className="text-xs font-bold opacity-90">{cafeName}</p>
          <h2 className="mt-2 text-[22px] font-black leading-snug tracking-tight">
            {promo.name}
          </h2>
          <p className="mt-2 text-[14px] font-medium opacity-95">{promo.label}</p>
          <div className="mt-5 inline-flex rounded-2xl bg-white/20 px-3 py-2 text-xs font-bold backdrop-blur-sm">
            {ui.specialOffer}
          </div>
        </div>

        <div className="p-4">
          <button
            type="button"
            className="w-full rounded-2xl py-3.5 text-[15px] font-extrabold text-white"
            style={{ background: "#1F2937" }}
            onClick={onCta}
          >
            {ui.goToMenu}
          </button>
          <button
            type="button"
            className="mt-2 w-full py-2 text-center text-xs font-semibold text-stone-400"
            onClick={onClose}
          >
            {ui.later}
          </button>
          <p className="mt-1 text-center text-[10px] text-stone-300">
            {ui.canCloseAnytime}
          </p>
        </div>
      </div>
    </div>
  );
}
