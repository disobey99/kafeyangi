"use client";

import { useEffect, useState } from "react";
import { OnlineOrderForm } from "@/components/online-order-form";
import { useMenuLocale } from "@/hooks/use-menu-locale";
import type { CafeBlockReason } from "@/lib/cafe-public-access";
import {
  DeliveryAppLockScreen,
  clearAppLock,
  hasAppLock,
  isAppUnlocked,
} from "./app-lock";
import { DeliveryBottomNav } from "./bottom-nav";
import { DeliveryHomeScreen } from "./home-screen";
import { DeliveryLoginScreen } from "./login-screen";
import { DeliveryOrdersScreen } from "./orders-screen";
import { CourierShell } from "./courier/courier-shell";
import { DeliveryProfileScreen } from "./profile-screen";
import { DeliveryPromoModal } from "./promo-modal";
import { DeliveryFavoritesModal } from "./favorites-modal";
import {
  dismissPromo,
  isPromoDismissed,
  pushSavedOrder,
  readDeliveryOrderType,
  readDeliveryProfile,
  readSavedAddresses,
  removeSavedAddress,
  selectDeliveryAddress,
  writeDeliveryOrderType,
  writeDeliveryProfile,
  readFavorites,
  toggleFavorite,
  clearDeliveryProfile,
  readDeliveryTab,
  writeDeliveryTab,
} from "./storage";
import { BrandIntroSplash } from "@/components/brand-intro-splash";
import { CustomerInstallHint } from "@/components/delivery-app/customer-install-hint";
import { TelegramWebAppInit } from "@/lib/telegram-web-app";
import { BAEMIN_TEAL } from "./theme";
import type {
  DeliveryAppTab,
  DeliveryCategory,
  DeliveryOrderType,
  DeliveryProfile,
  DeliveryPromo,
} from "./types";

type AppGate = "loading" | "mode" | "customer" | "courier-login" | "courier" | "login";

type CourierUser = { id: string; name: string; email: string };

export function DeliveryAppShell({
  menuSlug,
  cafeId,
  cafeName,
  categories,
  minOrderAmountSom = 0,
  deliveryFeeSom = 0,
  deliveryTimeMinutes = 45,
  deliveryEnabled = true,
  loyaltyEnabled = false,
  menuPrimaryColor = "#0d9488",
  logoUrl,
  social,
  supportPhone = null,
  paymeEnabled = false,
  blocked = null,
  initialPromo = null,
  homePromos = [],
  notices = [],
}: {
  menuSlug: string;
  cafeId: string;
  cafeName: string;
  categories: DeliveryCategory[];
  minOrderAmountSom?: number;
  deliveryFeeSom?: number;
  deliveryTimeMinutes?: number;
  deliveryEnabled?: boolean;
  loyaltyEnabled?: boolean;
  menuPrimaryColor?: string;
  logoUrl?: string | null;
  social?: {
    instagram?: string | null;
    telegram?: string | null;
    facebook?: string | null;
  };
  supportPhone?: string | null;
  paymeEnabled?: boolean;
  blocked?: CafeBlockReason | null;
  initialPromo?: DeliveryPromo | null;
  homePromos?: DeliveryPromo[];
  notices?: { id: string; title: string; body: string; priority: string; createdAt: Date | string }[];
}) {
  const { locale, setLocale } = useMenuLocale(menuSlug);
  const [gate, setGate] = useState<AppGate>("loading");
  const [courierUser, setCourierUser] = useState<CourierUser | null>(null);
  const [tab, setTab] = useState<DeliveryAppTab>("home");

  useEffect(() => {
    const saved = readDeliveryTab(menuSlug);
    if (saved) setTab(saved);
  }, [menuSlug]);

  function changeTab(next: DeliveryAppTab) {
    setTab(next);
    writeDeliveryTab(menuSlug, next);
  }
  const [orderType, setOrderType] = useState<DeliveryOrderType>("TAKEAWAY");
  const [profile, setProfile] = useState<DeliveryProfile | null>(null);
  const [search, setSearch] = useState("");
  const [focusCategoryId, setFocusCategoryId] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [promo, setPromo] = useState<DeliveryPromo | null>(null);
  const [showPromo, setShowPromo] = useState(false);
  const [customerLockOk, setCustomerLockOk] = useState(true);
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [favoriteIds, setFavorites] = useState<string[]>([]);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);
  const [installMode, setInstallMode] = useState<"customer" | "courier">(
    "customer",
  );
  const [hideInstallInTg, setHideInstallInTg] = useState(false);

  const primary = BAEMIN_TEAL;
  const cafeAccent = menuPrimaryColor || BAEMIN_TEAL;

  useEffect(() => {
    const modeParam =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") === "courier";
    setInstallMode(gate === "courier" || modeParam ? "courier" : "customer");
    const fromTg =
      Boolean(window.Telegram?.WebApp) ||
      new URLSearchParams(window.location.search).get("src") === "tg";
    setHideInstallInTg(fromTg);
  }, [gate]);

  const installHint = hideInstallInTg ? null : (
    <CustomerInstallHint
      cafeName={cafeName}
      storageKey={`nookline-cinstall-${menuSlug}`}
      accentColor={primary}
      mode={installMode}
    />
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setFavorites(readFavorites(menuSlug));
    }
  }, [menuSlug]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          const membership = (meData.user?.memberships ?? []).find(
            (m: { cafe: { id: string }; role: string }) =>
              m.cafe.id === cafeId && m.role === "COURIER",
          );
          if (membership && meData.user && !cancelled) {
            setCourierUser({
              id: meData.user.id,
              name: meData.user.name,
              email: meData.user.email,
            });
            setGate("courier");
            return;
          }
        }
      } catch {
        /* mijoz oqimi */
      }

      if (cancelled) return;
      const saved = readDeliveryProfile(menuSlug, cafeId);
      setProfile(saved);
      setOrderType(readDeliveryOrderType(menuSlug, deliveryEnabled));
      if (hasAppLock(menuSlug) && !isAppUnlocked(menuSlug)) {
        setCustomerLockOk(false);
      } else {
        setCustomerLockOk(true);
      }
      setGate(saved ? "customer" : "login");
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [cafeId, menuSlug, deliveryEnabled]);

  useEffect(() => {
    if (gate !== "customer" || !profile) return;
    const fallback: DeliveryPromo | null = initialPromo
      ? initialPromo
      : deliveryFeeSom === 0 && deliveryEnabled
        ? {
            id: "free-delivery",
            name: "Yetkazib berish",
            label: "Yetkazish shartlarini ko'ring — tez buyurtma bering",
          }
        : minOrderAmountSom > 0
          ? {
              id: "min-order",
              name: "Minimal buyurtma",
              label: `Minimal summa: ${minOrderAmountSom.toLocaleString("uz-UZ")} so'm`,
            }
          : {
              id: "welcome",
              name: `${cafeName} ga xush kelibsiz!`,
              label: "Onlayn buyurtma — uyga yetkazish yoki olib ketish",
            };

    const id = fallback.id ?? "welcome";
    setPromo(fallback);
    if (!isPromoDismissed(menuSlug, id)) {
      setShowPromo(true);
    }
  }, [
    gate,
    profile,
    menuSlug,
    initialPromo,
    deliveryFeeSom,
    deliveryEnabled,
    minOrderAmountSom,
    cafeName,
  ]);

  const address = profile?.address ?? "";
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);

  useEffect(() => {
    setSavedAddresses(readSavedAddresses(menuSlug, cafeId));
  }, [menuSlug, cafeId, profile?.address]);

  function changeOrderType(next: DeliveryOrderType) {
    if (next === "DELIVERY" && !deliveryEnabled) return;
    setOrderType(next);
    writeDeliveryOrderType(menuSlug, next);
  }

  function changeAddress(next: string, geo?: { lat: number; lng: number }) {
    if (!profile) return;
    const clean = next.trim();
    if (!clean) return;
    const list = selectDeliveryAddress(menuSlug, clean, cafeId);
    setSavedAddresses(list);
    const updated = {
      ...profile,
      address: clean,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
    };
    setProfile(updated);
    writeDeliveryProfile(menuSlug, updated, cafeId);
    void saveAppCustomer(updated);
  }

  function deleteAddress(addr: string) {
    if (!profile) return;
    const { list, selected } = removeSavedAddress(menuSlug, addr, cafeId);
    setSavedAddresses(list);
    const keepGeo = selected === profile.address.trim();
    const updated = {
      ...profile,
      address: selected,
      lat: keepGeo ? profile.lat : null,
      lng: keepGeo ? profile.lng : null,
    };
    setProfile(updated);
    writeDeliveryProfile(menuSlug, updated, cafeId);
    void saveAppCustomer(updated);
  }

  function changeProfile(next: DeliveryProfile) {
    if (next.address.trim()) {
      setSavedAddresses(selectDeliveryAddress(menuSlug, next.address, cafeId));
    }
    setProfile(next);
    writeDeliveryProfile(menuSlug, next, cafeId);
    void saveAppCustomer(next);
    if (loyaltyEnabled && next.phone.replace(/\D/g, "").length >= 9) {
      void fetch(`/api/cafes/${cafeId}/loyalty/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: next.phone }),
      }).catch(() => undefined);
    }
  }

  async function saveAppCustomer(next: DeliveryProfile) {
    try {
      await fetch(`/api/cafes/${cafeId}/app-customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {
      /* ignore */
    }
  }

  async function completeRegistration(next: DeliveryProfile) {
    writeDeliveryProfile(menuSlug, next, cafeId);
    setProfile(next);
    setGate("customer");
    await saveAppCustomer(next);
    if (loyaltyEnabled) {
      try {
        await fetch(`/api/cafes/${cafeId}/loyalty/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: next.phone }),
        });
      } catch {
        /* ignore */
      }
    }
  }

  function openMenu(categoryId?: string) {
    setFocusCategoryId(categoryId || null);
    changeTab("menu");
  }

  function openSearch() {
    setFocusCategoryId(null);
    changeTab("menu");
  }

  function closePromo() {
    if (promo?.id) dismissPromo(menuSlug, promo.id);
    setShowPromo(false);
  }

  async function courierLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setCourierUser(null);
    setGate("login");
  }

  const customerIntro = (
    <BrandIntroSplash
      title={cafeName}
      subtitle="Mijoz"
      storageKey={`nookline-customer-intro-${menuSlug}`}
      durationMs={2000}
      logoUrl={logoUrl}
      accentColor={cafeAccent}
    />
  );

  if (gate === "loading") {
    return (
      <>
        {customerIntro}
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center justify-center bg-[#F5F5F5] text-sm text-stone-500">
          Yuklanmoqda…
        </div>
      </>
    );
  }

  if (gate === "login") {
    return (
      <>
        {customerIntro}
        {installHint}
        <DeliveryLoginScreen
          cafeId={cafeId}
          cafeName={cafeName}
          logoUrl={logoUrl}
          primaryColor={primary}
          loyaltyEnabled={loyaltyEnabled}
          locale={locale}
          onLocaleChange={setLocale}
          onCustomerSuccess={(nextProfile) => {
            writeDeliveryProfile(menuSlug, nextProfile, cafeId);
            setProfile(nextProfile);
            if (hasAppLock(menuSlug) && !isAppUnlocked(menuSlug)) {
              setCustomerLockOk(false);
            } else {
              setCustomerLockOk(true);
            }
            setGate("customer");
            void saveAppCustomer(nextProfile);
            if (loyaltyEnabled) {
              void fetch(`/api/cafes/${cafeId}/loyalty/join`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone: nextProfile.phone }),
              }).catch(() => undefined);
            }
          }}
          onCourierSuccess={(user) => {
            setCourierUser(user);
            setGate("courier");
          }}
        />
      </>
    );
  }

  if (gate === "courier" && courierUser) {
    return (
      <>
        {installHint}
        <CourierShell
          cafeId={cafeId}
          cafeName={cafeName}
          primaryColor={primary}
          logoUrl={logoUrl}
          user={courierUser}
          onLogout={courierLogout}
          locale={locale}
        />
      </>
    );
  }

  // customer flow
  if (!customerLockOk && hasAppLock(menuSlug)) {
    return (
      <>
        {customerIntro}
        <DeliveryAppLockScreen
          slug={menuSlug}
          cafeName={cafeName}
          primaryColor={primary}
          mode="unlock"
          locale={locale}
          onUnlocked={() => setCustomerLockOk(true)}
        />
      </>
    );
  }

  if (showLockSetup) {
    return (
      <>
        {customerIntro}
        <DeliveryAppLockScreen
          slug={menuSlug}
          cafeName={cafeName}
          primaryColor={primary}
          mode="setup"
          locale={locale}
          onUnlocked={() => {
            setShowLockSetup(false);
            setCustomerLockOk(true);
          }}
        />
      </>
    );
  }

  const orderForm = profile ? (
    <OnlineOrderForm
      menuSlug={menuSlug}
      cafeId={cafeId}
      cafeName={cafeName}
      categories={categories}
      minOrderAmountSom={minOrderAmountSom}
      deliveryFeeSom={deliveryFeeSom}
      deliveryTimeMinutes={deliveryTimeMinutes}
      deliveryEnabled={deliveryEnabled}
      menuPrimaryColor={primary}
      logoUrl={logoUrl}
      social={social}
      paymeEnabled={paymeEnabled}
      blocked={blocked}
      variant="app"
      controlledOrderType={orderType}
      onOrderTypeChange={changeOrderType}
      controlledAddress={address}
      onAddressChange={changeAddress}
      controlledCustomerName={profile.name}
      controlledCustomerPhone={profile.phone}
      controlledCustomerLat={profile.lat}
      controlledCustomerLng={profile.lng}
      focusCategoryId={focusCategoryId}
      productSearch={search}
      forceShowCart={tab === "cart"}
      onCartCountChange={setCartCount}
      onRequestCart={() => changeTab("cart")}
      onOrderPlaced={(order) => {
        pushSavedOrder(menuSlug, {
          id: order.orderId,
          orderNumber: order.orderNumber,
          createdAt: new Date().toISOString(),
        });
        setOrdersRefresh((n) => n + 1);
        changeTab("orders");
      }}
    />
  ) : null;

  return (
    <>
    <TelegramWebAppInit />
    {customerIntro}
    {installHint}
    <div
      className="delivery-app-root relative mx-auto min-h-[100dvh] w-full max-w-md overflow-hidden"
      style={
        {
          ["--da-accent"]: cafeAccent,
          background: `
            radial-gradient(ellipse 90% 50% at 50% -10%, color-mix(in srgb, ${cafeAccent} 20%, transparent), transparent 55%),
            var(--da-surface)
          `,
        } as React.CSSProperties
      }
    >
      <div
        className="relative z-[1] min-h-[100dvh] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]"
      >
        {tab === "home" && (
          <DeliveryHomeScreen
            cafeName={cafeName}
            logoUrl={logoUrl}
            primaryColor={primary}
            customerName={profile?.name}
            locale={locale}
            orderType={orderType}
            deliveryEnabled={deliveryEnabled}
            address={address}
            savedAddresses={savedAddresses}
            search={search}
            categories={categories}
            cartCount={cartCount}
            minOrderAmountSom={minOrderAmountSom}
            deliveryFeeSom={deliveryFeeSom}
            deliveryTimeMinutes={deliveryTimeMinutes}
            promos={homePromos}
            notices={notices}
            favoriteIds={favoriteIds}
            onToggleFavorite={(productId) => {
              const next = toggleFavorite(menuSlug, productId);
              setFavorites(next);
            }}
            onOrderTypeChange={changeOrderType}
            onAddressChange={changeAddress}
            onAddressDelete={deleteAddress}
            onSearchChange={setSearch}
            onOpenCart={() => changeTab("cart")}
            onOpenCategory={(id) => openMenu(id || undefined)}
            onOpenSearch={openSearch}
            onOpenProfile={() => changeTab("profile")}
            onOpenProduct={(_product, categoryId) => openMenu(categoryId)}
            onOpenPromo={(p) => {
              setPromo(p);
              setShowPromo(true);
            }}
          />
        )}
        <div
          className={tab === "menu" || tab === "cart" ? "block" : "hidden"}
          aria-hidden={tab !== "menu" && tab !== "cart"}
        >
          {orderForm}
        </div>
        {tab === "orders" && (
          <DeliveryOrdersScreen
            slug={menuSlug}
            cafeId={cafeId}
            primaryColor={primary}
            locale={locale}
            refreshKey={ordersRefresh}
            customerPhone={profile?.phone}
          />
        )}
        {tab === "profile" && profile && (
          <DeliveryProfileScreen
            cafeId={cafeId}
            cafeName={cafeName}
            slug={menuSlug}
            primaryColor={primary}
            locale={locale}
            orderType={orderType}
            profile={profile}
            deliveryEnabled={deliveryEnabled}
            loyaltyEnabled={loyaltyEnabled}
            supportPhone={supportPhone}
            onLocaleChange={setLocale}
            onOrderTypeChange={changeOrderType}
            onProfileChange={changeProfile}
            onSwitchMode={() => {
              if (window.confirm("Ilova rejimini almashtirmoqchimisiz?")) {
                setGate("login");
              }
            }}
            onLogout={() => {
              if (window.confirm("Haqiqatan ham profilingizni o'chirib, tizimdan chiqmoqchimisiz?")) {
                clearDeliveryProfile(menuSlug, cafeId);
                setProfile(null);
                setGate("login");
              }
            }}
            onSetupAppLock={() => setShowLockSetup(true)}
            onClearAppLock={() => {
              clearAppLock(menuSlug);
              setCustomerLockOk(true);
            }}
            appLockEnabled={hasAppLock(menuSlug)}
            favoriteIds={favoriteIds}
            categories={categories}
            onToggleFavorite={(productId) => {
              const next = toggleFavorite(menuSlug, productId);
              setFavorites(next);
            }}
            onOpenProduct={(product, categoryId) => openMenu(categoryId)}
            onOpenFavorites={() => setShowFavoritesModal(true)}
          />
        )}
      </div>

      <DeliveryBottomNav
        tab={tab}
        cartCount={cartCount}
        locale={locale}
        onChange={(next) => {
          if (next === "cart") setFocusCategoryId(null);
          changeTab(next);
        }}
      />

      {profile && showPromo && promo && (
        <DeliveryPromoModal
          cafeName={cafeName}
          promo={promo}
          locale={locale}
          onClose={closePromo}
          onCta={() => {
            closePromo();
            openMenu();
          }}
        />
      )}

      {showFavoritesModal && (
        <DeliveryFavoritesModal
          favoriteIds={favoriteIds}
          categories={categories}
          locale={locale}
          primaryColor={primary}
          onClose={() => setShowFavoritesModal(false)}
          onToggleFavorite={(productId) => {
            const next = toggleFavorite(menuSlug, productId);
            setFavorites(next);
          }}
          onOpenProduct={(product, categoryId) => openMenu(categoryId)}
        />
      )}
    </div>
    </>
  );
}
