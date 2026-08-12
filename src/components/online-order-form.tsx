"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Search } from "lucide-react";
import { OrderStatusTracker } from "@/components/order-status-tracker";
import { formatPrice } from "@/lib/utils";
import { pickLocalizedDescription, pickLocalizedName } from "@/lib/menu-i18n";
import { getMenuUiLabels } from "@/lib/menu-ui-labels";
import type { MenuFoodTagId } from "@/lib/menu-food-tags";
import { CustomerMenuHeader } from "@/components/customer-menu-header";
import { MenuTagFilterBar } from "@/components/menu-tag-filter-bar";
import { CustomerCafeBlockedNotice } from "@/components/customer-cafe-blocked-notice";
import { useMenuLocale } from "@/hooks/use-menu-locale";
import type { CafeBlockReason } from "@/lib/cafe-public-access";

import { debounce } from "@/lib/debounce";
import { ProductMenuImage } from "@/components/product-menu-image";
import {
  ProductModifierPicker,
  type ModifierGroup,
} from "@/components/product-modifier-picker";
import { ProductDetailSheet } from "@/components/product-detail-sheet";
import { hasModifierGroups, mustPickModifiersBeforeAdd } from "@/lib/modifiers";

const CATEGORY_EMOJI = ["🍔", "🍕", "🌮", "🍣", "🥗", "🍰", "☕", "🍜", "🥘", "🧁"];

type Product = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  description: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  price: number;
  discountPrice?: number | null;
  imageUrl: string | null;
  menuTag?: string | null;
  isAvailable: boolean;
  modifierGroups?: ModifierGroup[];
};

type Category = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  products: Product[];
};

type CartItem = {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifierOptionIds: string[];
};

export function OnlineOrderForm({
  menuSlug,
  cafeId,
  cafeName,
  categories,
  minOrderAmountSom = 0,
  deliveryFeeSom = 0,
  deliveryTimeMinutes = 45,
  deliveryEnabled = true,
  menuPrimaryColor = "#d97706",
  logoUrl,
  social,
  paymeEnabled = false,
  blocked = null,
  variant = "standalone",
  controlledOrderType,
  onOrderTypeChange,
  controlledAddress,
  onAddressChange,
  controlledCustomerName,
  controlledCustomerPhone,
  controlledCustomerLat,
  controlledCustomerLng,
  focusCategoryId = null,
  productSearch = "",
  forceShowCart = false,
  onCartCountChange,
  onOrderPlaced,
  onRequestCart,
}: {
  menuSlug: string;
  cafeId: string;
  cafeName: string;
  categories: Category[];
  minOrderAmountSom?: number;
  deliveryFeeSom?: number;
  deliveryTimeMinutes?: number;
  deliveryEnabled?: boolean;
  menuPrimaryColor?: string;
  logoUrl?: string | null;
  social?: {
    instagram?: string | null;
    telegram?: string | null;
    facebook?: string | null;
  };
  paymeEnabled?: boolean;
  blocked?: CafeBlockReason | null;
  variant?: "standalone" | "app";
  controlledOrderType?: "TAKEAWAY" | "DELIVERY";
  onOrderTypeChange?: (t: "TAKEAWAY" | "DELIVERY") => void;
  controlledAddress?: string;
  onAddressChange?: (v: string) => void;
  controlledCustomerName?: string;
  controlledCustomerPhone?: string;
  controlledCustomerLat?: number | null;
  controlledCustomerLng?: number | null;
  focusCategoryId?: string | null;
  productSearch?: string;
  forceShowCart?: boolean;
  onCartCountChange?: (count: number) => void;
  onOrderPlaced?: (order: { orderId: string; orderNumber: number }) => void;
  onRequestCart?: () => void;
}) {
  const isApp = variant === "app";
  const { locale, setLocale } = useMenuLocale(menuSlug);
  const ui = getMenuUiLabels(locale);
  const minOrderFormatted = minOrderAmountSom.toLocaleString(
    locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ"
  );
  const [orderTypeLocal, setOrderTypeLocal] = useState<"TAKEAWAY" | "DELIVERY">(
    "TAKEAWAY",
  );
  const orderType = controlledOrderType ?? orderTypeLocal;
  function setOrderType(next: "TAKEAWAY" | "DELIVERY") {
    if (onOrderTypeChange) onOrderTypeChange(next);
    else setOrderTypeLocal(next);
  }
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [payWithPayme, setPayWithPayme] = useState(false);
  const [customerNameLocal, setCustomerNameLocal] = useState("");
  const [customerPhoneLocal, setCustomerPhoneLocal] = useState("");
  const customerName = controlledCustomerName ?? customerNameLocal;
  const customerPhone = controlledCustomerPhone ?? customerPhoneLocal;
  function setCustomerName(next: string) {
    if (controlledCustomerName !== undefined) return;
    setCustomerNameLocal(next);
  }
  function setCustomerPhone(next: string) {
    if (controlledCustomerPhone !== undefined) return;
    setCustomerPhoneLocal(next);
  }
  const [customerAddressLocal, setCustomerAddressLocal] = useState("");
  const customerAddress = controlledAddress ?? customerAddressLocal;
  function setCustomerAddress(next: string) {
    if (onAddressChange) onAddressChange(next);
    else setCustomerAddressLocal(next);
  }
  const profileLocked =
    isApp &&
    controlledCustomerName !== undefined &&
    controlledCustomerPhone !== undefined;
  const [notes, setNotes] = useState("");
  const [useLoyaltyPoints, setUseLoyaltyPoints] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: number; orderId: string } | null>(null);
  const [error, setError] = useState("");
  const [activeMenuTag, setActiveMenuTag] = useState<MenuFoodTagId | null>(null);
  const [appCategoryId, setAppCategoryId] = useState<string | null>(
    focusCategoryId,
  );
  const [appSearch, setAppSearch] = useState(productSearch);

  useEffect(() => {
    setAppCategoryId(focusCategoryId);
  }, [focusCategoryId]);

  useEffect(() => {
    setAppSearch(productSearch);
  }, [productSearch]);

  useEffect(() => {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    onCartCountChange?.(count);
  }, [cart, onCartCountChange]);

  const fetchLoyaltyRef = useRef(
    debounce((id: string, phone: string) => {
      fetch(`/api/cafes/${id}/loyalty?phone=${encodeURIComponent(phone)}`)
        .then((r) => r.json())
        .then((d) => setLoyaltyPoints(d.points ?? 0));
    }, 400),
  );

  useEffect(() => {
    if (customerPhone.length < 9) {
      setLoyaltyPoints(0);
      return;
    }
    fetchLoyaltyRef.current(cafeId, customerPhone);
    return () => fetchLoyaltyRef.current.cancel();
  }, [cafeId, customerPhone]);

  useEffect(() => {
    if (!deliveryEnabled && orderType === "DELIVERY") {
      setOrderType("TAKEAWAY");
    }
  }, [deliveryEnabled, orderType]);

  const categoryFilterId = isApp ? appCategoryId : focusCategoryId;
  const searchQ = (isApp ? appSearch : productSearch).trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    let list = categories;
    if (categoryFilterId) {
      list = list.filter((c) => c.id === categoryFilterId);
    }
    if (activeMenuTag) {
      list = list
        .map((cat) => ({
          ...cat,
          products: cat.products.filter((p) => p.menuTag === activeMenuTag),
        }))
        .filter((cat) => cat.products.length > 0);
    }
    if (searchQ) {
      list = list
        .map((cat) => ({
          ...cat,
          products: cat.products.filter((p) => {
            const name = pickLocalizedName(p, locale).toLowerCase();
            const desc = (pickLocalizedDescription(p, locale) ?? "").toLowerCase();
            return name.includes(searchQ) || desc.includes(searchQ);
          }),
        }))
        .filter((cat) => cat.products.length > 0);
    }
    return list;
  }, [categories, activeMenuTag, categoryFilterId, searchQ, locale]);

  const flatProducts = useMemo(
    () => filteredCategories.flatMap((c) => c.products),
    [filteredCategories],
  );

  function openModifierPicker(product: Product) {
    setPickerProduct(product);
  }

  function openProductDetail(product: Product) {
    setDetailProduct(product);
  }

  function addFromDetail() {
    if (!detailProduct) return;
    const p = detailProduct;
    setDetailProduct(null);
    addToCart(p);
  }

  function addToCart(product: Product) {
    if (blocked) return;
    if (!product.isAvailable) return;
    const groups = product.modifierGroups ?? [];
    if (mustPickModifiersBeforeAdd(groups)) {
      openModifierPicker(product);
      return;
    }
    const price = product.discountPrice ?? product.price;
    pushCart(product, price, pickLocalizedName(product, locale), []);
  }

  function pushCart(
    product: Product,
    unitPrice: number,
    displayName: string,
    modifierOptionIds: string[],
  ) {
    const key = `${product.id}:${modifierOptionIds.sort().join(",")}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: displayName,
          price: unitPrice,
          quantity: 1,
          modifierOptionIds,
        },
      ];
    });
  }

  function updateQty(cartKey: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === cartKey ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function productCartQty(productId: string) {
    return cart
      .filter((i) => i.productId === productId)
      .reduce((s, i) => s + i.quantity, 0);
  }

  /** Oddiy taom yoki bir xil variantlar uchun ± */
  function bumpProductQty(product: Product, delta: number) {
    if (blocked || !product.isAvailable) return;
    const lines = cart.filter((i) => i.productId === product.id);
    if (delta > 0) {
      if (mustPickModifiersBeforeAdd(product.modifierGroups ?? [])) {
        openModifierPicker(product);
        return;
      }
      if (lines.length === 1) {
        updateQty(lines[0].key, 1);
        return;
      }
      addToCart(product);
      return;
    }
    if (lines.length === 0) return;
    // Eng oxirgi qatorni kamaytiramiz
    updateQty(lines[lines.length - 1].key, -1);
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = orderType === "DELIVERY" ? deliveryFeeSom * 100 : 0;
  const subtotalWithDelivery = subtotal + deliveryFee;
  // Banner aksiyalar narxga ta'sir qilmaydi — chegirma taom discountPrice da (cart.price)
  const discount = 0;
  const loyaltyDiscount = useLoyaltyPoints && loyaltyPoints >= 100 ? 1_000_000 : 0;
  const total = Math.max(0, subtotalWithDelivery - discount - loyaltyDiscount);
  const minOk = minOrderAmountSom <= 0 || subtotal >= minOrderAmountSom * 100;

  async function submitOrder() {
    if (blocked) return;
    if (cart.length === 0) return;
    if (customerPhone.replace(/\D/g, "").length < 9) {
      setError(ui.phone);
      return;
    }
    if (orderType === "DELIVERY" && !customerAddress.trim()) {
      setError(ui.address);
      return;
    }

    const confirmMsg = payWithPayme && paymeEnabled
      ? locale === "ru"
        ? `Вы действительно хотите оформить заказ на сумму ${formatPrice(total, locale)} с оплатой через Payme?`
        : locale === "en"
          ? `Are you sure you want to place an order for ${formatPrice(total, locale)} paying with Payme?`
          : `Haqiqatan ham ${formatPrice(total, locale)} miqdorida Payme orqali to'lov qilib, buyurtma bermoqchimisiz?`
      : locale === "ru"
        ? `Вы действительно хотите оформить заказ на сумму ${formatPrice(total, locale)}?`
        : locale === "en"
          ? `Are you sure you want to place an order for ${formatPrice(total, locale)}?`
          : `Haqiqatan ham ${formatPrice(total, locale)} miqdorida buyurtma bermoqchimisiz?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId,
          type: orderType,
          customerName: customerName || undefined,
          customerPhone,
          customerAddress: orderType === "DELIVERY" ? customerAddress : undefined,
          customerLat:
            orderType === "DELIVERY" && controlledCustomerLat != null
              ? controlledCustomerLat
              : undefined,
          customerLng:
            orderType === "DELIVERY" && controlledCustomerLng != null
              ? controlledCustomerLng
              : undefined,
          notes,
          useLoyaltyPoints: useLoyaltyPoints && loyaltyPoints >= 100,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            modifierOptionIds: i.modifierOptionIds.length ? i.modifierOptionIds : undefined,
          })),
          payWithPayme: payWithPayme && paymeEnabled,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || ui.genericError);
        return;
      }

      if (data.paymeCheckoutUrl) {
        window.location.href = data.paymeCheckoutUrl;
        return;
      }

      if (isApp) {
        setCart([]);
        onOrderPlaced?.({ orderId: data.id, orderNumber: data.orderNumber });
      } else {
        setSuccess({ orderNumber: data.orderNumber, orderId: data.id });
        setCart([]);
      }
    } catch {
      setError(ui.connectionError);
    } finally {
      setLoading(false);
    }
  }

  if (success && !isApp) {
    return (
      <div className="min-h-[100dvh] bg-stone-50">
        <header className="bg-green-600 px-4 py-6 text-center text-white">
          <p className="text-5xl">✓</p>
          <h1 className="mt-2 text-xl font-bold">{ui.successTitle}</h1>
          <p className="mt-1 text-3xl font-black">
            #{String(success.orderNumber).padStart(3, "0")}
          </p>
        </header>
        <OrderStatusTracker orderId={success.orderId} />
      </div>
    );
  }

  if (success && isApp) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-4xl text-emerald-600">✓</p>
        <h2 className="mt-3 text-xl font-bold text-stone-900">{ui.successTitle}</h2>
        <p className="mt-1 text-3xl font-black" style={{ color: menuPrimaryColor }}>
          #{String(success.orderNumber).padStart(3, "0")}
        </p>
        <p className="mt-2 text-sm text-stone-500">Holat Buyurtmalar bo&apos;limida</p>
      </div>
    );
  }

  const showCartPanel = forceShowCart || (!isApp && cart.length > 0);
  const cartPanel = showCartPanel ? (
        <div
          className={
            isApp
              ? "space-y-3 rounded-2xl bg-white p-4 shadow-sm"
              : "customer-menu-sheet fixed bottom-0 left-0 right-0 p-4 shadow-lg"
          }
        >
          <div className="mx-auto max-w-lg space-y-3">
            {cart.length === 0 && forceShowCart ? (
              <p className="py-6 text-center text-sm text-stone-500">{ui.menuEmptyCart}</p>
            ) : null}
            {cart.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 text-sm text-stone-900"
              >
                <span className="min-w-0 flex-1 font-medium leading-snug">{item.name}</span>
                <div className="bistro-cart-stepper" role="group" aria-label="Miqdor">
                  <button
                    type="button"
                    onClick={() => updateQty(item.key, -1)}
                    className="bistro-cart-stepper-btn"
                    aria-label="Kamaytirish"
                  >
                    <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
                  </button>
                  <span className="bistro-cart-stepper-qty">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.key, 1)}
                    className="bistro-cart-stepper-btn is-plus"
                    aria-label="Qo'shish"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                  </button>
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <>
            {profileLocked ? (
              <div className="rounded-xl bg-stone-50 px-3 py-2.5 text-sm text-stone-600 dark:bg-white/5">
                <p className="font-semibold text-stone-900">{customerName}</p>
                <p>{customerPhone}</p>
                {orderType === "DELIVERY" ? (
                  <p className="mt-1.5 text-sm font-semibold text-stone-800">
                    {customerAddress?.trim()
                      ? customerAddress
                      : locale === "ru"
                        ? "Адрес не выбран"
                        : locale === "en"
                          ? "No address selected"
                          : "Manzil tanlanmagan"}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-stone-400">
                  {locale === "ru"
                    ? "Адрес из приложения — сменить можно на главной"
                    : locale === "en"
                      ? "Address from the app — change it on the home screen"
                      : "Ilovadagi manzil — o'zgartirish uchun bosh sahifa"}
                </p>
              </div>
            ) : (
              <>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={ui.nameOptional}
                  className="customer-menu-input"
                />
                <input
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={ui.phone}
                  className="customer-menu-input"
                />
                {orderType === "DELIVERY" && (
                  <input
                    required
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder={ui.address}
                    className="customer-menu-input"
                  />
                )}
              </>
            )}
            {profileLocked && orderType === "DELIVERY" && !customerAddress ? (
              <p className="text-sm text-amber-700">
                {locale === "ru"
                  ? "Введите адрес доставки в профиле"
                  : locale === "en"
                    ? "Enter delivery address in profile"
                    : "Profilga yetkazish manzilini kiriting"}
              </p>
            ) : null}
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={ui.notes}
              className="customer-menu-input"
            />

            {orderType === "DELIVERY" && deliveryFeeSom > 0 && (
              <div className="flex justify-between text-sm text-stone-600">
                <span>{ui.deliveryFee}</span>
                <span>{formatPrice(deliveryFeeSom * 100, locale)}</span>
              </div>
            )}
            {loyaltyPoints >= 100 && (
              <label className="flex items-center gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  checked={useLoyaltyPoints}
                  onChange={(e) => setUseLoyaltyPoints(e.target.checked)}
                />
                {ui.loyaltyUse(loyaltyPoints)}
              </label>
            )}
            {paymeEnabled && (
              <label className="flex items-center gap-2 text-sm text-stone-800">
                <input
                  type="checkbox"
                  checked={payWithPayme}
                  onChange={(e) => setPayWithPayme(e.target.checked)}
                />
                {ui.payWithPayme}
              </label>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>{ui.discount}</span>
                <span>-{formatPrice(discount, locale)}</span>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {!minOk && (
              <p className="text-sm text-amber-700">
                {ui.minOrderNotMet(minOrderFormatted)}
              </p>
            )}
            <button
              onClick={submitOrder}
              disabled={loading || !minOk || Boolean(blocked)}
              className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50"
              style={{ background: menuPrimaryColor }}
            >
              {loading ? ui.ordering : `${ui.order} · ${formatPrice(total, locale)}`}
            </button>
              </>
            )}
          </div>
        </div>
  ) : null;

  return (
    <div
      className={
        isApp
          ? `customer-bistro ${forceShowCart ? "" : "pb-28"}`
          : "min-h-[100dvh] bg-stone-50 pb-40"
      }
      style={
        isApp
          ? ({ ["--bistro-accent"]: menuPrimaryColor } as React.CSSProperties)
          : undefined
      }
    >
      {!isApp && (
        <CustomerMenuHeader
          cafeName={cafeName}
          logoUrl={logoUrl}
          social={social}
          menuPrimaryColor={menuPrimaryColor}
          locale={locale}
          onLocaleChange={setLocale}
          subtitle={
            <p className="text-sm text-white/80">
              {ui.onlineOrderHeader(deliveryTimeMinutes)}
            </p>
          }
        />
      )}
      {/* Delivery app — QR bistro menyu */}
      {isApp && !forceShowCart && (
        <div className="bistro-layout has-cart">
          <div className="bistro-catalog">
            <header className="bistro-topbar">
              <div className="bistro-topbar-row">
                <div className="bistro-brand">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="bistro-brand-logo" />
                  ) : (
                    <span className="bistro-brand-logo grid place-items-center text-sm font-black">
                      {cafeName.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <p className="bistro-brand-name">{cafeName}</p>
                    <p className="bistro-brand-sub">
                      {orderType === "DELIVERY" ? ui.delivery : ui.takeaway}
                      {minOrderAmountSom > 0
                        ? ` · min. ${minOrderFormatted} ${locale === "ru" ? "сум" : locale === "en" ? "som" : "so'm"}`
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {blocked && (
              <div className="px-4 pt-3">
                <CustomerCafeBlockedNotice reason={blocked} locale={locale} />
              </div>
            )}

            <div className="bistro-search-wrap">
              <Search className="bistro-search-icon" aria-hidden />
              <input
                type="search"
                value={appSearch}
                onChange={(e) => setAppSearch(e.target.value)}
                placeholder={ui.menuSearch}
                className="bistro-search-input"
              />
            </div>

            <MenuTagFilterBar
              locale={locale}
              activeTag={activeMenuTag}
              onChange={setActiveMenuTag}
              className="bistro-tag-filter"
            />

            <section className="bistro-categories">
              <h2 className="bistro-section-title">{ui.menuCategories}</h2>
              <div className="bistro-category-scroll">
                <button
                  type="button"
                  onClick={() => setAppCategoryId(null)}
                  className={`bistro-category-chip ${appCategoryId === null ? "is-active" : ""}`}
                >
                  <span className="bistro-category-icon">✨</span>
                  <span>{ui.menuAllCategories}</span>
                </button>
                {categories.map((cat, idx) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setAppCategoryId(cat.id)}
                    className={`bistro-category-chip ${appCategoryId === cat.id ? "is-active" : ""}`}
                  >
                    <span className="bistro-category-icon">
                      {CATEGORY_EMOJI[idx % CATEGORY_EMOJI.length]}
                    </span>
                    <span>{pickLocalizedName(cat, locale)}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="bistro-dishes">
              {flatProducts.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-stone-500">
                  Mahsulot topilmadi
                </p>
              ) : (
                <div className="bistro-dish-grid">
                  {flatProducts.map((product) => {
                    const name = pickLocalizedName(product, locale);
                    const description = pickLocalizedDescription(product, locale);
                    const qty = productCartQty(product.id);
                    const needsVariant = hasModifierGroups(product.modifierGroups);
                    const inCart = qty > 0;
                    return (
                      <article
                        key={product.id}
                        className={`bistro-dish-card ${inCart ? "is-in-cart" : ""} ${!product.isAvailable ? "is-unavailable" : ""}`}
                      >
                        <button
                          type="button"
                          className="bistro-dish-img-wrap block w-[calc(100%-1.5rem)] text-left"
                          onClick={() => openProductDetail(product)}
                        >
                          <div className="relative">
                            <ProductMenuImage
                              url={product.imageUrl}
                              name={name}
                              menuTag={product.menuTag}
                              size="card"
                            />
                            {product.discountPrice ? (
                              <span className="absolute top-2 right-2 flex h-6 px-1.5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-md ring-2 ring-white animate-pulse">
                                -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                              </span>
                            ) : null}
                          </div>
                        </button>
                        <div className="bistro-dish-body">
                          <button
                            type="button"
                            className="w-full text-left"
                            onClick={() => openProductDetail(product)}
                          >
                            <h3 className="bistro-dish-name">{name}</h3>
                            {description && (
                              <p className="bistro-dish-desc">{description}</p>
                            )}
                          </button>
                          {!product.isAvailable && (
                            <p className="bistro-dish-unavail">{ui.unavailable}</p>
                          )}

                          <div className="bistro-dish-foot">
                            <button
                              type="button"
                              className="bistro-dish-price-block"
                              onClick={() => openProductDetail(product)}
                            >
                              <span className="bistro-dish-from">{ui.menuFromPrice}</span>
                              <span className="bistro-dish-price flex flex-col items-start leading-tight">
                                {product.discountPrice ? (
                                  <>
                                    <span className="text-red-600 font-extrabold">
                                      {formatPrice(product.discountPrice, locale)}
                                    </span>
                                    <span className="text-[11px] text-stone-400 line-through font-normal">
                                      {formatPrice(product.price, locale)}
                                    </span>
                                  </>
                                ) : (
                                  <span>{formatPrice(product.price, locale)}</span>
                                )}
                              </span>
                            </button>

                            <div className="bistro-dish-actions">
                              {needsVariant ? (
                                <button
                                  type="button"
                                  onClick={() => openModifierPicker(product)}
                                  disabled={!product.isAvailable || Boolean(blocked)}
                                  className="bistro-dish-variant"
                                >
                                  Variant
                                </button>
                              ) : null}

                              {inCart ? (
                                <div className="bistro-dish-stepper" role="group" aria-label="Miqdor">
                                  <button
                                    type="button"
                                    className="bistro-dish-stepper-btn"
                                    onClick={() => bumpProductQty(product, -1)}
                                    disabled={Boolean(blocked)}
                                    aria-label="Kamaytirish"
                                  >
                                    <Minus className="h-3.5 w-3.5" strokeWidth={2.6} />
                                  </button>
                                  <span className="bistro-dish-stepper-qty">{qty}</span>
                                  <button
                                    type="button"
                                    className="bistro-dish-stepper-btn is-plus"
                                    onClick={() => bumpProductQty(product, 1)}
                                    disabled={!product.isAvailable || Boolean(blocked)}
                                    aria-label="Qo'shish"
                                  >
                                    <Plus className="h-3.5 w-3.5" strokeWidth={2.6} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    needsVariant
                                      ? openModifierPicker(product)
                                      : addToCart(product)
                                  }
                                  disabled={!product.isAvailable || Boolean(blocked)}
                                  className="bistro-dish-add"
                                  aria-label={ui.add}
                                >
                                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Standalone online (eski sayt ro'yxati) */}
      {!isApp && (
      <main className="mx-auto max-w-lg px-4 py-4">
        {blocked && (
          <div className="mb-6">
            <CustomerCafeBlockedNotice reason={blocked} locale={locale} />
          </div>
        )}

        <div className={`mb-6 flex gap-2 ${blocked ? "pointer-events-none opacity-50" : ""}`}>
          {(["TAKEAWAY", "DELIVERY"] as const).map((t) => {
            if (t === "DELIVERY" && !deliveryEnabled) return null;
            return (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              className={`flex-1 rounded-xl py-3 text-sm font-medium ${
                orderType === t
                  ? "text-white"
                  : "bg-white text-stone-600 shadow-sm"
              }`}
              style={orderType === t ? { background: menuPrimaryColor } : undefined}
            >
              {t === "TAKEAWAY" ? ui.takeaway : ui.delivery}
            </button>
            );
          })}
        </div>
        {minOrderAmountSom > 0 && (
          <p className="mb-4 text-xs text-stone-500">
            {ui.minOrder(minOrderFormatted)}
          </p>
        )}

        <MenuTagFilterBar
          locale={locale}
          activeTag={activeMenuTag}
          onChange={setActiveMenuTag}
          className="mb-6"
        />

        {filteredCategories.map((cat) => (
          <section key={cat.id} className="mb-6">
            <h2 className="mb-3 font-semibold text-stone-800">
              {pickLocalizedName(cat, locale)}
            </h2>
            <div className="space-y-2">
              {cat.products.map((product) => {
                const name = pickLocalizedName(product, locale);
                const description = pickLocalizedDescription(product, locale);
                return (
                <div
                  key={product.id}
                  className="flex overflow-hidden rounded-xl bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => openProductDetail(product)}
                    className="flex min-w-0 flex-1 items-center gap-3 p-3 text-left"
                  >
                    <div className="relative shrink-0">
                      <ProductMenuImage
                        url={product.imageUrl}
                        name={name}
                        menuTag={product.menuTag}
                      />
                      {product.discountPrice ? (
                        <span className="absolute -top-1 -right-1.5 flex h-5 px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-sm ring-1 ring-white">
                          -{Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                        </span>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{name}</p>
                      {description && (
                        <p className="line-clamp-2 text-xs text-stone-400">{description}</p>
                      )}
                    </div>
                    <div className="shrink-0 flex flex-col items-end leading-tight">
                      {product.discountPrice ? (
                        <>
                          <span className="font-extrabold text-red-600">
                            {formatPrice(product.discountPrice, locale)}
                          </span>
                          <span className="text-[11px] text-stone-400 line-through font-normal">
                            {formatPrice(product.price, locale)}
                          </span>
                        </>
                      ) : (
                        <span className="font-semibold" style={{ color: menuPrimaryColor }}>
                          {formatPrice(product.price, locale)}
                        </span>
                      )}
                    </div>
                  </button>
                  {hasModifierGroups(product.modifierGroups) && (
                    <button
                      type="button"
                      onClick={() => openModifierPicker(product)}
                      disabled={!product.isAvailable}
                      className="shrink-0 border-l border-stone-100 px-3 text-xs font-semibold disabled:opacity-50"
                      style={{ color: menuPrimaryColor }}
                    >
                      {ui.customize}
                    </button>
                  )}
                </div>
              );
              })}
            </div>
          </section>
        ))}
        {filteredCategories.length === 0 && (
          <p className="py-8 text-center text-sm text-stone-500">Mahsulot topilmadi</p>
        )}
      </main>
      )}

      {forceShowCart && isApp ? (
        <div className="mx-auto max-w-lg px-4 py-4">{cartPanel}</div>
      ) : (
        !isApp && cartPanel
      )}

      {isApp && !forceShowCart && cart.length > 0 && (
        <div
          className="fixed z-30 flex w-full max-w-md -translate-x-1/2 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] pt-2"
          style={{
            left: "50%",
            bottom: "calc(4.25rem + env(safe-area-inset-bottom, 0px))",
            background:
              "linear-gradient(to top, var(--bistro-bg, #f4f1ea) 65%, transparent)",
          }}
        >
          <button
            type="button"
            className="bistro-mobile-bar-btn"
            onClick={() => onRequestCart?.()}
          >
            <span>{ui.menuCart}</span>
            <span className="bistro-mobile-bar-badge">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
            <span className="bistro-mobile-bar-total ml-auto">
              {formatPrice(total, locale)}
            </span>
          </button>
        </div>
      )}
      {detailProduct && (
        <ProductDetailSheet
          product={{
            id: detailProduct.id,
            name: detailProduct.name,
            description: detailProduct.description,
            price: detailProduct.price,
            imageUrl: detailProduct.imageUrl,
            menuTag: detailProduct.menuTag,
            isAvailable: detailProduct.isAvailable,
          }}
          accent={menuPrimaryColor}
          localeName={pickLocalizedName(detailProduct, locale)}
          localeDescription={pickLocalizedDescription(detailProduct, locale)}
          blocked={Boolean(blocked)}
          onClose={() => setDetailProduct(null)}
          onAdd={addFromDetail}
        />
      )}
      {pickerProduct && (
        <ProductModifierPicker
          productName={pickLocalizedName(pickerProduct, locale)}
          basePrice={pickerProduct.discountPrice ?? pickerProduct.price}
          groups={pickerProduct.modifierGroups ?? []}
          locale={locale}
          onCancel={() => setPickerProduct(null)}
          onConfirm={(optionIds, totalUnitPrice, summary) => {
            const baseName = pickLocalizedName(pickerProduct, locale);
            pushCart(
              pickerProduct,
              totalUnitPrice,
              summary ? `${baseName} (${summary})` : baseName,
              optionIds,
            );
            setPickerProduct(null);
          }}
        />
      )}
    </div>
  );
}
