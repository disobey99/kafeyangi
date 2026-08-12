"use client";

import { Bike, Percent, Sparkles } from "lucide-react";
import type { DeliveryPromo } from "./types";

export type HomeOfferCard = DeliveryPromo & {
  tone: "hero" | "dark" | "warm";
  imageUrl?: string | null;
};

export function buildHomeOfferCards({
  promos,
  deliveryEnabled,
  deliveryFeeSom,
  minOrderAmountSom,
  cafeName,
  foodImages = [],
}: {
  promos: DeliveryPromo[];
  deliveryEnabled: boolean;
  deliveryFeeSom: number;
  minOrderAmountSom: number;
  cafeName: string;
  foodImages?: string[];
}): HomeOfferCard[] {
  // We want to return exactly 3 cards corresponding to Slot 1, Slot 2, Slot 3
  const cards: (HomeOfferCard | null)[] = [null, null, null];
  const tones: HomeOfferCard["tone"][] = ["hero", "dark", "warm"];

  // 1. Place promotions that have explicit slots (1, 2, or 3)
  const slot1Promo = promos.find((p) => p.slot === 1);
  const slot2Promo = promos.find((p) => p.slot === 2);
  const slot3Promo = promos.find((p) => p.slot === 3);

  if (slot1Promo) {
    cards[0] = {
      ...slot1Promo,
      tone: "hero",
      imageUrl: slot1Promo.imageUrl || foodImages[0] || null,
    };
  }
  if (slot2Promo) {
    cards[1] = {
      ...slot2Promo,
      tone: "dark",
      imageUrl: slot2Promo.imageUrl || foodImages[1] || null,
    };
  }
  if (slot3Promo) {
    cards[2] = {
      ...slot3Promo,
      tone: "warm",
      imageUrl: slot3Promo.imageUrl || foodImages[2] || null,
    };
  }

  // 2. Fill remaining empty slots with promotions that do NOT have an explicit slot
  const unassignedPromos = promos.filter((p) => !p.slot);
  let unassignedIdx = 0;
  for (let i = 0; i < 3; i++) {
    if (cards[i] === null && unassignedIdx < unassignedPromos.length) {
      const p = unassignedPromos[unassignedIdx++];
      cards[i] = {
        ...p,
        tone: tones[i] ?? "warm",
        imageUrl: p.imageUrl || foodImages[i] || null,
      };
    }
  }

  // 3. Fill remaining empty slots with default fillers
  const welcomeFiller: HomeOfferCard = {
    id: "welcome",
    name: cafeName,
    label: "Onlayn buyurtma ochiq",
    tone: "hero",
    imageUrl: foodImages[0] ?? null,
  };

  const minOrderFiller: HomeOfferCard = {
    id: "min-order",
    name: "Min. buyurtma",
    label: `${minOrderAmountSom.toLocaleString("uz-UZ")} so'm`,
    tone: "dark",
    imageUrl: foodImages[1] ?? null,
  };

  let deliveryFiller: HomeOfferCard = {
    id: "delivery-fee",
    name: "Yetkazish",
    label: `${deliveryFeeSom.toLocaleString("uz-UZ")} so'm`,
    tone: "warm",
    imageUrl: foodImages[2] ?? null,
  };
  if (deliveryFeeSom === 0) {
    deliveryFiller = {
      id: "free-delivery",
      name: "Yetkazish bepul",
      label: "Shu hafta uchun",
      tone: "warm",
      imageUrl: foodImages[2] ?? null,
    };
  }

  // Slot 1 default: Welcome
  if (cards[0] === null) {
    cards[0] = welcomeFiller;
  }

  // Slot 2 default: Min Order (if > 0) else Welcome
  if (cards[1] === null) {
    cards[1] = minOrderAmountSom > 0 ? minOrderFiller : welcomeFiller;
  }

  // Slot 3 default: Delivery (if enabled) else Welcome
  if (cards[2] === null) {
    cards[2] = deliveryEnabled ? deliveryFiller : welcomeFiller;
  }

  // Ensure all are non-null HomeOfferCards
  return cards.map((c, idx) => c || {
    id: `fallback-${idx}`,
    name: cafeName,
    label: "Onlayn xizmat",
    tone: tones[idx] ?? "warm",
    imageUrl: foodImages[idx] ?? null,
  });
}

function OfferFace({
  card,
  primaryColor,
  compact,
}: {
  card: HomeOfferCard;
  primaryColor: string;
  compact?: boolean;
}) {
  const hasCustomImage = Boolean(card.imageUrl);
  const bg =
    card.tone === "hero"
      ? primaryColor
      : card.tone === "dark"
        ? "#2F3338"
        : "#7DD3D0";
  const text = hasCustomImage ? "#ffffff" : (card.tone === "warm" ? "#0f766e" : "#ffffff");
  const Icon =
    card.id === "free-delivery" || card.id === "delivery-fee"
      ? Bike
      : card.tone === "hero"
        ? Percent
        : Sparkles;

  return (
    <div
      className={`relative flex h-full overflow-hidden rounded-[22px] ${
        compact ? "p-3" : "p-4"
      }`}
      style={{ background: bg, color: text }}
    >
      {card.imageUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={card.imageUrl}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        </>
      ) : (
        <div
          className={`pointer-events-none absolute rounded-full bg-white/15 blur-2xl ${
            compact ? "-right-4 -top-4 h-24 w-24" : "-right-6 -top-6 h-36 w-36"
          }`}
        />
      )}
      <div className="relative z-[1] flex min-w-0 flex-1 flex-col justify-between">
        <span
          className={`inline-flex w-fit items-center justify-center rounded-full bg-black/10 ${
            compact ? "p-1.5" : "p-2"
          }`}
        >
          <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} strokeWidth={2.4} />
        </span>
        <div className={compact ? "mt-2" : "mt-6"}>
          {card.type === "PERCENT" && card.value != null ? (
            <p
              className={`font-black leading-none tracking-tight ${
                compact ? "text-[22px]" : "text-[34px]"
              }`}
            >
              {card.value}%
            </p>
          ) : null}
          <p
            className={`font-extrabold leading-snug ${
              compact ? "mt-0.5 text-[12px]" : "mt-1 text-[15px]"
            }`}
          >
            {card.name}
          </p>
          <p
            className={`font-medium opacity-90 ${
              compact ? "mt-0.5 text-[10px] leading-tight" : "mt-1 text-[12px]"
            }`}
          >
            {card.label}
          </p>
        </div>
      </div>
    </div>
  );
}

export function DeliveryHomePromoGrid({
  cards,
  primaryColor,
  onOpen,
}: {
  cards: HomeOfferCard[];
  primaryColor: string;
  onOpen?: (card: HomeOfferCard) => void;
}) {
  if (cards.length === 0) return null;

  const [hero, second, third] = cards;

  return (
    <section className="px-1 pb-3 pt-1">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <h2 className="text-[16px] font-extrabold text-stone-900">Aksiyalar</h2>
        <span className="text-[12px] font-bold text-stone-400">Maxsus</span>
      </div>

      <div className="grid h-[200px] grid-cols-2 gap-2.5">
        <button
          type="button"
          className="w-full h-full text-left"
          onClick={() => onOpen?.(hero)}
        >
          <OfferFace card={hero} primaryColor={primaryColor} />
        </button>

        <div className="grid h-full grid-rows-2 gap-2.5">
          {(second ? [second, third ?? second] : [hero, hero])
            .slice(0, 2)
            .map((card, i) => (
              <button
                key={`${card.id}-${i}`}
                type="button"
                className="w-full h-full min-h-0 text-left"
                onClick={() => onOpen?.(card)}
              >
                <OfferFace card={card} primaryColor={primaryColor} compact />
              </button>
            ))}
        </div>
      </div>
    </section>
  );
}
