"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, Minus, Plus, Search, ShoppingBag, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { pickLocalizedDescription, pickLocalizedName } from "@/lib/menu-i18n";
import { getMenuUiLabels } from "@/lib/menu-ui-labels";
import { OrderStatusTracker } from "@/components/order-status-tracker";
import { CustomerTableActions } from "@/components/customer-table-actions";
import { CustomerOrderHistory } from "@/components/customer-order-history";
import { SelfServiceReadyNotifier } from "@/components/self-service-ready-notifier";
import { rememberTableOrder } from "@/lib/customer-table-session";
import { MenuLocaleSwitcher } from "@/components/menu-locale-switcher";
import { useMenuLocale } from "@/hooks/use-menu-locale";
import { useGuestTableVisit } from "@/hooks/use-guest-table-visit";
import { MenuProductSuggestions } from "@/components/menu-product-suggestions";
import { MenuTagFilterBar } from "@/components/menu-tag-filter-bar";
import { CustomerCafeBlockedNotice } from "@/components/customer-cafe-blocked-notice";
import type { MenuFoodTagId } from "@/lib/menu-food-tags";
import type { CafeBlockReason } from "@/lib/cafe-public-access";
import { getCafeBlockedCopy } from "@/lib/cafe-public-access";

import { ProductMenuImage } from "@/components/product-menu-image";
import {
  ProductModifierPicker,
  type ModifierGroup,
} from "@/components/product-modifier-picker";
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

export function OrderForm({
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
  loyaltyEnabled = false,
  blocked = null,
  onBack,
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
  loyaltyEnabled?: boolean;
  blocked?: CafeBlockReason | null;
  onBack?: () => void;
}) {
  const { locale, setLocale } = useMenuLocale(menuSlug);
  const ui = getMenuUiLabels(locale);
  const {
    visitToken,
    orderingAllowed,
    sessionClosed,
    tableBusy,
    loading: visitLoading,
    error: visitError,
  } = useGuestTableVisit(tableId, qrToken);
  const canOrder =
    Boolean(visitToken) && orderingAllowed && !sessionClosed && !tableBusy && !blocked;
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ orderNumber: number; orderId: string } | null>(null);
  const [error, setError] = useState("");
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [serviceMode, setServiceMode] = useState<"WAITER" | "SELF">("WAITER");
  const [lockedServiceMode, setLockedServiceMode] = useState<"WAITER" | "SELF" | null>(null);
  const [customerPhone, setCustomerPhone] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeMenuTag, setActiveMenuTag] = useState<MenuFoodTagId | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [pairingProductId, setPairingProductId] = useState<string | null>(null);

  const allProducts = useMemo(
    () => categories.flatMap((cat) => cat.products.map((p) => ({ ...p, categoryId: cat.id }))),
    [categories],
  );

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  useEffect(() => {
    if (!loyaltyEnabled) return;
    try {
      const saved = sessionStorage.getItem(`table-loyalty-phone-${qrToken}`);
      if (saved) setCustomerPhone(saved);
    } catch {
      /* ignore */
    }
  }, [qrToken, loyaltyEnabled]);

  useEffect(() => {
    if (!visitToken) return;
    const params = new URLSearchParams({ token: qrToken, visitToken });
    fetch(`/api/tables/${tableId}/guest-session?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.lockedServiceMode) {
          setLockedServiceMode(d.lockedServiceMode);
          setServiceMode(d.lockedServiceMode);
        }
      });
  }, [tableId, qrToken, visitToken]);

  function openModifierPicker(product: Product) {
    setPickerProduct(product);
  }

  function addToCart(product: Product) {
    if (!product.isAvailable) return;
    const groups = product.modifierGroups ?? [];
    if (mustPickModifiersBeforeAdd(groups)) {
      openModifierPicker(product);
      return;
    }
    pushCart(product, product.price, pickLocalizedName(product, locale), []);
  }

  function pushCart(
    product: Product,
    unitPrice: number,
    displayName: string,
    modifierOptionIds: string[],
  ) {
    const key = `${product.id}:${modifierOptionIds.slice().sort().join(",")}`;
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
    setPairingProductId(product.id);
  }

  function updateQty(cartKey: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === cartKey ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = 0;
  const effectiveMode = lockedServiceMode ?? serviceMode;
  const serviceFee =
    effectiveMode === "WAITER" && waiterServiceFeePercent > 0
      ? Math.round(((subtotal - discount) * waiterServiceFeePercent) / 100)
      : 0;
  const total = subtotal - discount;

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const items: (Product & { categoryId: string })[] = [];
    for (const cat of categories) {
      if (activeCategoryId && cat.id !== activeCategoryId) continue;
      for (const product of cat.products) {
        if (activeMenuTag && product.menuTag !== activeMenuTag) continue;
        if (!q) {
          items.push({ ...product, categoryId: cat.id });
          continue;
        }
        const name = pickLocalizedName(product, locale).toLowerCase();
        const desc = (pickLocalizedDescription(product, locale) ?? "").toLowerCase();
        if (name.includes(q) || desc.includes(q)) {
          items.push({ ...product, categoryId: cat.id });
        }
      }
    }
    return items;
  }, [categories, activeCategoryId, activeMenuTag, searchQuery, locale]);

  async function submitOrder() {
    if (cart.length === 0 || !canOrder || !visitToken) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId,
          tableId,
          notes,
          serviceMode: effectiveMode,
          qrToken,
          guestVisitToken: visitToken,
          customerPhone: customerPhone.trim() || undefined,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            modifierOptionIds: i.modifierOptionIds.length ? i.modifierOptionIds : undefined,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || ui.genericError);
        return;
      }

      setSuccess({ orderNumber: data.orderNumber, orderId: data.id });
      rememberTableOrder(qrToken, data.id);
      if (loyaltyEnabled && customerPhone.trim()) {
        try {
          sessionStorage.setItem(`table-loyalty-phone-${qrToken}`, customerPhone.trim());
        } catch {
          /* ignore */
        }
      }
      setHistoryRefresh((n) => n + 1);
      setCart([]);
      setNotes("");
    } catch {
      setError(ui.connectionError);
    } finally {
      setLoading(false);
    }
  }

  function renderCartPanel(showHeader = true) {
    return (
      <div className="bistro-cart-inner">
        {showHeader && (
          <div className="bistro-cart-head">
            <h2 className="bistro-cart-title">{ui.menuCart}</h2>
            <span className="bistro-cart-count">{ui.menuItemsCount(cartCount)}</span>
          </div>
        )}
        {cart.length === 0 ? (
          <p className="bistro-cart-empty">{ui.menuEmptyCart}</p>
        ) : (
          <ul className="bistro-cart-list">
            {cart.map((item) => (
              <li key={item.key} className="bistro-cart-item">
                <div className="bistro-cart-item-info">
                  <p className="bistro-cart-item-name">{item.name}</p>
                  <p className="bistro-cart-item-price">{formatPrice(item.price * item.quantity)}</p>
                </div>
                <div className="bistro-cart-qty">
                  <button type="button" onClick={() => updateQty(item.key, -1)} aria-label="-">
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span>{item.quantity}</span>
                  <button type="button" onClick={() => updateQty(item.key, 1)} aria-label="+">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {cart.length > 0 && (
          <>
            <CustomerTableActions
              tableId={tableId}
              qrToken={qrToken}
              visitToken={visitToken}
              ui={ui}
              variant="inline"
              disabled={Boolean(blocked)}
            />
            {!lockedServiceMode && (
              <div className="bistro-service-mode">
                <p className="bistro-service-label">{ui.table}</p>
                <div className="bistro-service-grid">
                  <button
                    type="button"
                    onClick={() => setServiceMode("WAITER")}
                    className={`bistro-service-btn ${effectiveMode === "WAITER" ? "is-active" : ""}`}
                  >
                    <span className="font-semibold">{ui.serviceWithWaiter}</span>
                    <span className="bistro-service-hint">
                      {waiterServiceFeePercent > 0
                        ? ui.serviceWithWaiterHint(waiterServiceFeePercent)
                        : ui.serviceWithWaiter}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setServiceMode("SELF")}
                    className={`bistro-service-btn ${effectiveMode === "SELF" ? "is-active" : ""}`}
                  >
                    <span className="font-semibold">{ui.serviceSelf}</span>
                    <span className="bistro-service-hint">{ui.serviceSelfHint}</span>
                  </button>
                </div>
              </div>
            )}
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={ui.notesOptional}
              className="customer-menu-input bistro-cart-input"
            />
            {loyaltyEnabled && (
              <div>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={ui.phoneOptionalLoyalty}
                  className="customer-menu-input bistro-cart-input"
                  inputMode="tel"
                />
                <p className="bistro-cart-hint">{ui.phoneLoyaltyHint}</p>
              </div>
            )}
            {error && <p className="bistro-cart-error">{error}</p>}
            {discount > 0 && (
              <div className="bistro-cart-row bistro-cart-discount">
                <span>{ui.discount}</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            {serviceFee > 0 && (
              <div className="bistro-cart-row">
                <span>{ui.serviceFee}</span>
                <span>{formatPrice(serviceFee)}</span>
              </div>
            )}
            <div className="bistro-cart-row bistro-cart-total">
              <span>{ui.order}</span>
              <span>{formatPrice(total)}</span>
            </div>
            <button
              type="button"
              onClick={submitOrder}
              disabled={loading || !canOrder}
              className="bistro-confirm-btn"
            >
              {loading ? ui.ordering : ui.order}
            </button>
          </>
        )}
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[100dvh] bg-stone-50">
        <header className="bg-green-600 px-4 py-6 text-center text-white">
          <p className="text-5xl">✓</p>
          <h1 className="mt-2 text-xl font-bold">{ui.successTitle}</h1>
          <p className="mt-1 text-3xl font-black">
            #{String(success.orderNumber).padStart(3, "0")}
          </p>
          <p className="text-sm text-green-100">{ui.tableNumber(tableNumber)}</p>
        </header>
        <OrderStatusTracker
          tableId={tableId}
          qrToken={qrToken}
          visitToken={visitToken}
          orderId={success.orderId}
        />
        <SelfServiceReadyNotifier
          tableId={tableId}
          qrToken={qrToken}
          visitToken={visitToken}
          ui={ui}
        />
        <CustomerTableActions
          tableId={tableId}
          qrToken={qrToken}
          visitToken={visitToken}
          ui={ui}
          disabled={Boolean(blocked)}
        />
        <div className="px-4 pb-8 text-center">
          <button
            onClick={() => setSuccess(null)}
            className="rounded-lg bg-amber-600 px-6 py-2 text-white"
          >
            {ui.orderAgain}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="customer-bistro"
      style={{ "--bistro-accent": menuPrimaryColor } as CSSProperties}
    >
      <header className="bistro-topbar">
        <div className="bistro-topbar-row">
          {onBack ? (
            <button type="button" onClick={onBack} className="bistro-back-btn">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="bistro-back-spacer" />
          )}
          <div className="bistro-brand">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="" className="bistro-brand-logo" />
            )}
            <div className="min-w-0">
              <h1 className="bistro-brand-name">{cafeName}</h1>
              <p className="bistro-brand-sub">{ui.tableNumber(tableNumber)}</p>
            </div>
          </div>
          <MenuLocaleSwitcher locale={locale} onChange={setLocale} showLabel label={ui.lang} />
        </div>
      </header>

      {blocked && (
        <div className="px-4 pt-3">
          <CustomerCafeBlockedNotice reason={blocked} locale={locale} compact />
        </div>
      )}

      {(blocked || tableBusy || sessionClosed || visitError || (!visitLoading && !canOrder)) && (
        <div className="bistro-alert">
          {blocked
            ? getCafeBlockedCopy(blocked, locale).title
            : tableBusy
              ? ui.tableBusy
              : sessionClosed
                ? ui.sessionClosed
                : visitError ?? ui.orderingDisabled}
        </div>
      )}

      <OrderStatusTracker tableId={tableId} qrToken={qrToken} visitToken={visitToken} />
      <SelfServiceReadyNotifier tableId={tableId} qrToken={qrToken} visitToken={visitToken} ui={ui} />
      <CustomerOrderHistory
        tableId={tableId}
        qrToken={qrToken}
        visitToken={visitToken}
        ui={ui}
        refreshKey={historyRefresh}
      />

      <div className={`bistro-layout ${cartCount > 0 ? "has-cart" : ""}`}>
        <div className="bistro-catalog">
          <div className="bistro-search-wrap">
            <Search className="bistro-search-icon" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                onClick={() => setActiveCategoryId(null)}
                className={`bistro-category-chip ${activeCategoryId === null ? "is-active" : ""}`}
              >
                <span className="bistro-category-icon">✨</span>
                <span>{ui.menuAllCategories}</span>
              </button>
              {categories.map((cat, idx) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`bistro-category-chip ${activeCategoryId === cat.id ? "is-active" : ""}`}
                >
                  <span className="bistro-category-icon">{CATEGORY_EMOJI[idx % CATEGORY_EMOJI.length]}</span>
                  <span>{pickLocalizedName(cat, locale)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="bistro-dishes">
            <div className="bistro-dish-grid">
              {filteredProducts.map((product) => {
                const name = pickLocalizedName(product, locale);
                const description = pickLocalizedDescription(product, locale);
                const inCart = cart.some((i) => i.productId === product.id);
                return (
                  <article
                    key={product.id}
                    className={`bistro-dish-card ${inCart ? "is-in-cart" : ""} ${!product.isAvailable ? "is-unavailable" : ""}`}
                  >
                    <div className="bistro-dish-img-wrap">
                      <ProductMenuImage
                        url={product.imageUrl}
                        name={name}
                        menuTag={product.menuTag}
                        size="card"
                      />
                    </div>
                    <div className="bistro-dish-body">
                      <h3 className="bistro-dish-name">{name}</h3>
                      {description && <p className="bistro-dish-desc">{description}</p>}
                      {!product.isAvailable && (
                        <p className="bistro-dish-unavail">{ui.unavailable}</p>
                      )}
                      <div className="bistro-dish-foot">
                        <div>
                          <p className="bistro-dish-from">{ui.menuFromPrice}</p>
                          <p className="bistro-dish-price">{formatPrice(product.price)}</p>
                        </div>
                        <div className="bistro-dish-actions">
                          {hasModifierGroups(product.modifierGroups) && (
                            <button
                              type="button"
                              onClick={() => openModifierPicker(product)}
                              disabled={!product.isAvailable}
                              className="bistro-dish-customize"
                            >
                              {ui.customize}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => addToCart(product)}
                            disabled={!product.isAvailable || !canOrder}
                            className="bistro-dish-add"
                            aria-label={ui.add}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="bistro-cart-panel bistro-cart-panel-desktop">{renderCartPanel()}</aside>
      </div>

      {cartCount === 0 && (
        <CustomerTableActions
          tableId={tableId}
          qrToken={qrToken}
          visitToken={visitToken}
          ui={ui}
          variant="floating"
          disabled={Boolean(blocked)}
        />
      )}

      {cartCount > 0 && (
        <div className="bistro-mobile-bar">
          <button type="button" className="bistro-mobile-bar-btn" onClick={() => setCartOpen(true)}>
            <ShoppingBag className="h-5 w-5" />
            <span>{ui.menuCart}</span>
            <span className="bistro-mobile-bar-badge">{cartCount}</span>
            <span className="bistro-mobile-bar-total">{formatPrice(total)}</span>
          </button>
        </div>
      )}

      {cartOpen && cartCount > 0 && (
        <div className="bistro-cart-sheet" onClick={() => setCartOpen(false)} role="presentation">
          <div className="bistro-cart-sheet-panel" onClick={(e) => e.stopPropagation()}>
            <div className="bistro-cart-sheet-head">
              <h2>{ui.menuCart}</h2>
              <button type="button" onClick={() => setCartOpen(false)} aria-label={ui.hubClose}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderCartPanel(false)}
          </div>
        </div>
      )}

      {pickerProduct && (
        <ProductModifierPicker
          productName={pickLocalizedName(pickerProduct, locale)}
          basePrice={pickerProduct.price}
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

      <MenuProductSuggestions
        cafeId={cafeId}
        productId={pairingProductId}
        onDismiss={() => setPairingProductId(null)}
        onAdd={(productId) => {
          const product = allProducts.find((p) => p.id === productId);
          if (product) addToCart(product);
          setPairingProductId(null);
        }}
      />
    </div>
  );
}
