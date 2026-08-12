"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Home, ShoppingBag, Smile } from "lucide-react";
import { BAEMIN_TEAL } from "./theme";
import type { DeliveryAppTab } from "./types";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";

export function DeliveryBottomNav({
  tab,
  cartCount,
  locale,
  onChange,
}: {
  tab: DeliveryAppTab;
  cartCount: number;
  locale: MenuLocale;
  primaryColor?: string;
  onChange: (tab: DeliveryAppTab) => void;
}) {
  const [hidden, setHidden] = useState(false);
  const ui = getDeliveryUiLabels(locale);

  const LEFT: { id: DeliveryAppTab; label: string; icon: typeof Home }[] = [
    { id: "home", label: ui.homeTab, icon: Home },
    { id: "orders", label: ui.ordersTab, icon: ClipboardList },
  ];

  const RIGHT: { id: DeliveryAppTab; label: string; icon: typeof Home }[] = [
    { id: "profile", label: ui.profileTab, icon: Smile },
  ];

  useEffect(() => {
    const sync = () => setHidden(document.body.dataset.daModal === "1");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-da-modal"],
    });
    return () => obs.disconnect();
  }, []);

  function NavBtn({
    id,
    label,
    icon: Icon,
  }: {
    id: DeliveryAppTab;
    label: string;
    icon: typeof Home;
  }) {
    const active = tab === id;
    return (
      <button
        type="button"
        className="flex flex-1 flex-col items-center gap-0.5 py-1"
        onClick={() => onChange(id)}
      >
        <Icon
          className="h-[22px] w-[22px]"
          strokeWidth={active ? 2.5 : 1.8}
          style={{
            color: active
              ? "var(--da-ink)"
              : "color-mix(in srgb, var(--da-ink) 72%, var(--da-muted))",
          }}
        />
        <span
          className="text-[10px] font-bold"
          style={{
            color: active
              ? "var(--da-ink)"
              : "color-mix(in srgb, var(--da-ink) 72%, var(--da-muted))",
          }}
        >
          {label}
        </span>
      </button>
    );
  }

  if (hidden) return null;

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 px-4 pb-[calc(0.65rem+env(safe-area-inset-bottom,0px))]"
      aria-label="Asosiy menyu"
    >
      <div
        className="pointer-events-auto relative mx-auto flex items-end justify-between gap-1 rounded-[28px] px-2 pb-2 pt-2 shadow-[0_12px_40px_rgba(26,29,38,0.14)] backdrop-blur-2xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
        style={{
          background: "var(--da-nav)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px var(--da-border)",
        }}
      >
        {LEFT.map((t) => (
          <NavBtn key={t.id} {...t} />
        ))}

        <button
          type="button"
          onClick={() => onChange("cart")}
          className="relative -mt-7 mb-0.5 flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full shadow-[0_10px_28px_rgba(42,193,188,0.45)]"
          style={{ background: "var(--da-accent, " + BAEMIN_TEAL + ")" }}
          aria-label="Savat"
        >
          <ShoppingBag className="h-6 w-6 text-white" strokeWidth={2.3} />
          {cartCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[#FF2D55] px-1 text-[10px] font-extrabold leading-none text-white">
              {cartCount > 99 ? "99+" : cartCount}
            </span>
          )}
        </button>

        <button
          type="button"
          className="flex flex-1 flex-col items-center gap-0.5 py-1"
          onClick={() => onChange("menu")}
        >
          <span
            className="grid h-[22px] w-[22px] place-items-center text-[15px] font-black leading-none"
            style={{
              color:
                tab === "menu"
                  ? "var(--da-ink)"
                  : "color-mix(in srgb, var(--da-ink) 72%, var(--da-muted))",
            }}
          >
            ≡
          </span>
          <span
            className="text-[10px] font-bold"
            style={{
              color:
                tab === "menu"
                  ? "var(--da-ink)"
                  : "color-mix(in srgb, var(--da-ink) 72%, var(--da-muted))",
            }}
          >
            {ui.menuTab}
          </span>
        </button>

        {RIGHT.map((t) => (
          <NavBtn key={t.id} {...t} />
        ))}
      </div>
    </nav>
  );
}
