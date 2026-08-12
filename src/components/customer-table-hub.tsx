"use client";

import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  CircleFadingArrowUp,
  Gift,
  Info,
  Send,
  Share2,
  UtensilsCrossed,
} from "lucide-react";
import { FaInstagram } from "react-icons/fa6";
import { OrderForm } from "@/app/c/[slug]/t/[qrToken]/order-form";
import { CustomerMenuHeader } from "@/components/customer-menu-header";
import { CustomerCafeBlockedNotice } from "@/components/customer-cafe-blocked-notice";
import { getMenuUiLabels } from "@/lib/menu-ui-labels";
import { useMenuLocale } from "@/hooks/use-menu-locale";
import type { CafeBlockReason } from "@/lib/cafe-public-access";
import type { ModifierGroup } from "@/components/product-modifier-picker";

type HubInfo = {
  loyalty: {
    enabled: boolean;
    terms: string;
    redeemPeriodLabel: string;
    cashbackPercent: number;
  };
  social: {
    instagram: string | null;
    telegram: string | null;
    facebook: string | null;
  };
  telegramBotDeepLink: string | null;
};

type Category = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  products: {
    id: string;
    name: string;
    nameRu?: string | null;
    nameEn?: string | null;
    description: string | null;
    descriptionRu?: string | null;
    descriptionEn?: string | null;
    price: number;
    imageUrl: string | null;
    menuTag?: string | null;
    isAvailable: boolean;
    modifierGroups?: ModifierGroup[];
  }[];
};

type HubView = "hub" | "order" | "loyalty" | "social";

export function CustomerTableHub({
  menuSlug,
  qrToken,
  cafeId,
  cafeName,
  tableId,
  tableNumber,
  categories,
  logoUrl,
  menuPrimaryColor = "#d97706",
  waiterServiceFeePercent = 0,
  blocked = null,
}: {
  menuSlug: string;
  qrToken: string;
  cafeId: string;
  cafeName: string;
  tableId: string;
  tableNumber: number;
  categories: Category[];
  logoUrl?: string | null;
  menuPrimaryColor?: string;
  waiterServiceFeePercent?: number;
  blocked?: CafeBlockReason | null;
}) {
  const { locale, setLocale } = useMenuLocale(menuSlug);
  const ui = getMenuUiLabels(locale);
  const [view, setView] = useState<HubView>("hub");
  const [hubInfo, setHubInfo] = useState<HubInfo | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [loyaltyPhone, setLoyaltyPhone] = useState("");
  const [loyaltyBalance, setLoyaltyBalance] = useState<{
    cashbackSom: number;
    points: number;
    canRedeemCashback: boolean;
  } | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!termsOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTermsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [termsOpen]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  function goTo(next: HubView) {
    setTermsOpen(false);
    setView(next);
  }

  function openTerms(e: React.MouseEvent) {
    e.stopPropagation();
    setTermsOpen(true);
  }

  useEffect(() => {
    fetch(`/api/public/cafe/${menuSlug}/hub-info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setHubInfo({
            loyalty: d.loyalty,
            social: d.social,
            telegramBotDeepLink: d.telegramBotDeepLink,
          });
        }
      });
  }, [menuSlug]);

  async function checkLoyaltyBalance() {
    if (!loyaltyPhone.trim()) return;
    setLoyaltyLoading(true);
    setLoyaltyBalance(null);
    try {
      await fetch(`/api/cafes/${cafeId}/loyalty/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: loyaltyPhone }),
      }).catch(() => undefined);

      const res = await fetch(
        `/api/cafes/${cafeId}/loyalty?phone=${encodeURIComponent(loyaltyPhone)}`,
      );
      const data = await res.json();
      if (res.ok) {
        setLoyaltyBalance({
          cashbackSom: data.cashbackSom ?? 0,
          points: data.points ?? 0,
          canRedeemCashback: data.canRedeemCashback ?? false,
        });
      }
    } finally {
      setLoyaltyLoading(false);
    }
  }

  if (view === "order") {
    return (
      <OrderForm
        menuSlug={menuSlug}
        qrToken={qrToken}
        cafeId={cafeId}
        cafeName={cafeName}
        tableId={tableId}
        tableNumber={tableNumber}
        categories={categories}
        logoUrl={logoUrl}
        menuPrimaryColor={menuPrimaryColor}
        waiterServiceFeePercent={waiterServiceFeePercent}
        loyaltyEnabled={hubInfo?.loyalty.enabled ?? false}
        blocked={blocked}
        onBack={() => goTo("hub")}
      />
    );
  }

  const socialLinks = [
    hubInfo?.social.instagram && {
      label: "Instagram",
      url: hubInfo.social.instagram,
      icon: FaInstagram,
    },
    hubInfo?.social.telegram && {
      label: "Telegram",
      url: hubInfo.social.telegram,
      icon: Send,
    },
    hubInfo?.social.facebook && {
      label: "Facebook",
      url: hubInfo.social.facebook,
      icon: CircleFadingArrowUp,
    },
  ].filter(Boolean) as { label: string; url: string; icon: ComponentType<{ className?: string }> }[];

  return (
    <div className="min-h-[100dvh] bg-stone-50">
      <div className="sticky top-0 z-10">
        <CustomerMenuHeader
          cafeName={cafeName}
          logoUrl={logoUrl}
          menuPrimaryColor={menuPrimaryColor}
          locale={locale}
          onLocaleChange={setLocale}
          subtitle={<p className="text-sm text-white/80">{ui.tableNumber(tableNumber)}</p>}
        />
      </div>

      <main className="mx-auto max-w-lg px-4 py-6">
        {view !== "hub" && (
          <button
            type="button"
            onClick={() => goTo("hub")}
            className="mb-4 flex items-center gap-2 text-sm font-medium text-stone-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {ui.hubBack}
          </button>
        )}

        {view === "hub" && (
          <>
            {blocked && (
              <div className="mb-6">
                <CustomerCafeBlockedNotice reason={blocked} locale={locale} />
              </div>
            )}
            <p className="mb-6 text-center text-sm text-stone-500">{ui.hubWelcome}</p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => !blocked && goTo("order")}
                disabled={Boolean(blocked)}
                className={`flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-[0.98] ${
                  blocked ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: menuPrimaryColor }}
                >
                  <UtensilsCrossed className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-semibold text-stone-900">{ui.hubOrderFood}</span>
                  <span className="mt-0.5 block text-xs text-stone-500">{ui.hubOrderFoodSub}</span>
                </span>
              </button>

              <div className="flex w-full overflow-hidden rounded-2xl bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => goTo("loyalty")}
                  className="flex flex-1 items-center gap-4 p-5 text-left transition active:bg-stone-50"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Gift className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-stone-900">{ui.hubLoyalty}</span>
                    <span className="mt-0.5 block text-xs text-stone-500">{ui.hubLoyaltySub}</span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={openTerms}
                  className="flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-l-2 border-amber-200 bg-amber-50 text-amber-800 transition active:bg-amber-100"
                  aria-label={ui.hubLoyaltyTerms}
                >
                  <Info className="h-6 w-6" strokeWidth={2.25} />
                  <span className="text-[10px] font-bold uppercase tracking-wide">info</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => goTo("social")}
                className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm transition active:scale-[0.98]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Share2 className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-semibold text-stone-900">{ui.hubSocial}</span>
                  <span className="mt-0.5 block text-xs text-stone-500">{ui.hubSocialSub}</span>
                </span>
              </button>
            </div>
          </>
        )}

        {view === "loyalty" && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">{ui.hubLoyalty}</h2>
            {!hubInfo?.loyalty.enabled ? (
              <p className="mt-3 text-sm text-stone-500">{ui.hubLoyaltyDisabled}</p>
            ) : (
              <>
                <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600">
                  {hubInfo.loyalty.terms}
                </p>
                <p className="mt-3 text-xs text-stone-400">
                  {ui.hubCashbackRedeemHint(hubInfo.loyalty.redeemPeriodLabel)}
                </p>

                <div className="mt-6 border-t border-stone-100 pt-5">
                  <p className="text-sm font-semibold text-stone-800">{ui.hubCheckCashback}</p>
                  <p className="mt-1 text-xs text-stone-500">{ui.hubPhoneHint}</p>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={loyaltyPhone}
                      onChange={(e) => setLoyaltyPhone(e.target.value)}
                      placeholder="+998901234567"
                      className="customer-menu-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={checkLoyaltyBalance}
                      disabled={loyaltyLoading}
                      className="shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      style={{ backgroundColor: menuPrimaryColor }}
                    >
                      {loyaltyLoading ? "..." : ui.hubCheck}
                    </button>
                  </div>
                  {loyaltyBalance && (
                    <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      <p>
                        {ui.hubCashbackBalance}:{" "}
                        <strong>{loyaltyBalance.cashbackSom.toLocaleString("uz-UZ")} so&apos;m</strong>
                      </p>
                      <p className="mt-1">
                        {ui.hubPointsBalance}: <strong>{loyaltyBalance.points}</strong>
                      </p>
                      {loyaltyBalance.canRedeemCashback ? (
                        <p className="mt-1 text-emerald-700">{ui.hubCanRedeem}</p>
                      ) : loyaltyBalance.cashbackSom > 0 ? (
                        <p className="mt-1 text-stone-600">{ui.hubCannotRedeemYet}</p>
                      ) : null}
                    </div>
                  )}
                </div>

                {hubInfo.telegramBotDeepLink && (
                  <a
                    href={hubInfo.telegramBotDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 py-3 text-sm font-semibold text-sky-800"
                  >
                    {ui.hubTelegramBot}
                  </a>
                )}
              </>
            )}
          </div>
        )}

        {view === "social" && (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">{ui.hubSocial}</h2>
            {socialLinks.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">{ui.hubSocialEmpty}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {socialLinks.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-800 transition hover:bg-stone-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <link.icon className="h-4 w-4 text-stone-500" />
                        {link.label}
                      </span>
                      <span className="text-stone-400">→</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>

      {mounted &&
        termsOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setTermsOpen(false)}
            role="presentation"
          >
            <div
              className="customer-menu-modal max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="loyalty-terms-title"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 id="loyalty-terms-title" className="text-lg font-bold text-stone-900">
                  {ui.hubLoyaltyTerms}
                </h3>
                <button
                  type="button"
                  onClick={() => setTermsOpen(false)}
                  className="rounded-lg px-2 py-1 text-stone-400 hover:bg-stone-100"
                  aria-label={ui.hubClose}
                >
                  ✕
                </button>
              </div>
              {!hubInfo ? (
                <p className="mt-3 text-sm text-stone-500">Yuklanmoqda...</p>
              ) : !hubInfo.loyalty.enabled ? (
                <p className="mt-3 text-sm text-stone-600">{ui.hubLoyaltyDisabled}</p>
              ) : (
                <>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-stone-600">
                    {hubInfo.loyalty.terms}
                  </p>
                  <p className="mt-3 text-xs text-stone-400">
                    {ui.hubCashbackRedeemHint(hubInfo.loyalty.redeemPeriodLabel)}
                  </p>
                </>
              )}
              <button
                type="button"
                onClick={() => setTermsOpen(false)}
                className="mt-4 w-full rounded-xl py-2.5 text-sm font-semibold text-white"
                style={{ backgroundColor: menuPrimaryColor }}
              >
                {ui.hubClose}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
