"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Heart,
  Home,
  Menu,
  MoreHorizontal,
  Search,
  ShoppingBasket,
  Store,
  ChevronLeft,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  pickLocalizedDescription,
  pickLocalizedName,
  type MenuLocale,
} from "@/lib/menu-i18n";
import { MenuLocaleSwitcher } from "@/components/menu-locale-switcher";
import { useMenuLocale } from "@/hooks/use-menu-locale";
import { getMenuUiLabels } from "@/lib/menu-ui-labels";
import {
  ProductModifierPicker,
  type ModifierGroup,
} from "@/components/product-modifier-picker";
import { hasModifierGroups, mustPickModifiersBeforeAdd } from "@/lib/modifiers";

type Product = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionRu?: string | null;
  descriptionEn?: string | null;
  price: number;
  imageUrl: string | null;
  modifierGroups?: ModifierGroup[];
};

type Category = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  products: Product[];
};

type CafeInfo = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  address: string | null;
  phone: string | null;
  menuPrimaryColor: string;
  minOrderAmountSom: number;
  deliveryFeeSom: number;
  deliveryTimeMinutes: number;
  deliveryEnabled: boolean;
};

type CartItem = {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifierOptionIds: string[];
};

type Tab = "home" | "cafe" | "menu" | "cart" | "more";

const CATEGORY_COLORS = [
  { bg: "#facc15", sub: "#ca8a04" },
  { bg: "#fb923c", sub: "#ea580c" },
  { bg: "#9f1239", sub: "#881337" },
  { bg: "#92400e", sub: "#78350f" },
  { bg: "#059669", sub: "#047857" },
];

const LABELS = {
  uz: {
    menu: "Menyu",
    search: "Butun katalog bo'yicha qidirish",
    home: "Bosh sahifa",
    cafe: "Kafe",
    cart: "Savat",
    more: "Boshqa",
    delivery: "Yetkazish",
    takeaway: "Olib ketish",
    order: "Buyurtma berish",
    emptyCart: "Savat bo'sh",
    addItems: "Menyudan taom tanlang",
    success: "Buyurtma qabul qilindi!",
    phone: "Telefon *",
    address: "Manzil *",
    name: "Ismingiz",
    notes: "Izoh",
    minOrder: "Minimal buyurtma",
    favorites: "Sevimlilar",
    about: "Biz haqimizda",
    openMenu: "Menyuni ochish",
    welcome: "Xush kelibsiz!",
    orderVia: "Telegram orqali buyurtma bering",
  },
  ru: {
    menu: "Меню",
    search: "Поиск по всему каталогу",
    home: "Главная",
    cafe: "Кафе",
    cart: "Корзина",
    more: "Другое",
    delivery: "Доставка",
    takeaway: "Самовывоз",
    order: "Оформить заказ",
    emptyCart: "Корзина пуста",
    addItems: "Выберите блюда из меню",
    success: "Заказ принят!",
    phone: "Телефон *",
    address: "Адрес *",
    name: "Ваше имя",
    notes: "Комментарий",
    minOrder: "Минимальный заказ",
    favorites: "Избранное",
    about: "О нас",
    openMenu: "Открыть меню",
    welcome: "Добро пожаловать!",
    orderVia: "Закажите через Telegram",
  },
  en: {
    menu: "Menu",
    search: "Search the catalog",
    home: "Home",
    cafe: "Cafe",
    cart: "Cart",
    more: "More",
    delivery: "Delivery",
    takeaway: "Takeaway",
    order: "Place order",
    emptyCart: "Cart is empty",
    addItems: "Pick items from the menu",
    success: "Order accepted!",
    phone: "Phone *",
    address: "Address *",
    name: "Your name",
    notes: "Notes",
    minOrder: "Minimum order",
    favorites: "Favorites",
    about: "About",
    openMenu: "Open menu",
    welcome: "Welcome!",
    orderVia: "Order via Telegram",
  },
};

function favKey(slug: string) {
  return `tg-fav-${slug}`;
}

export function TgMenuApp({
  slug,
  cafe: initialCafe,
  categories: initialCategories,
}: {
  slug: string;
  cafe: CafeInfo;
  categories: Category[];
}) {
  const [tab, setTab] = useState<Tab>("menu");
  const { locale, setLocale } = useMenuLocale(slug);
  const ui = getMenuUiLabels(locale);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [orderType, setOrderType] = useState<"TAKEAWAY" | "DELIVERY">("TAKEAWAY");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<number | null>(null);
  const t = LABELS[locale];
  const accent = initialCafe.menuPrimaryColor;
  const categories = initialCategories;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(favKey(slug));
      if (raw) setFavorites(new Set(JSON.parse(raw) as string[]));
    } catch {
      /* ignore */
    }
  }, [slug]);

  useEffect(() => {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    if (user?.first_name && !customerName) {
      setCustomerName([user.first_name, user.last_name].filter(Boolean).join(" "));
    }
  }, [customerName]);

  const toggleFavorite = useCallback(
    (productId: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(productId)) next.delete(productId);
        else next.add(productId);
        localStorage.setItem(favKey(slug), JSON.stringify([...next]));
        return next;
      });
    },
    [slug],
  );

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? categories[0];

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pool = selectedCategoryId
      ? categories.filter((c) => c.id === selectedCategoryId)
      : categories;
    const products = pool.flatMap((c) => c.products);
    if (!q) return products;
    return products.filter((p) => {
      const names = [p.name, p.nameRu, p.nameEn].filter(Boolean).join(" ").toLowerCase();
      return names.includes(q);
    });
  }, [categories, selectedCategoryId, search]);

  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);
  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = orderType === "DELIVERY" ? initialCafe.deliveryFeeSom * 100 : 0;
  const subtotalWithDelivery = subtotal + deliveryFee;
  const discount = 0;
  const total = Math.max(0, subtotalWithDelivery - discount);
  const minOk =
    initialCafe.minOrderAmountSom <= 0 || subtotal >= initialCafe.minOrderAmountSom * 100;

  function openModifierPicker(product: Product) {
    setPickerProduct(product);
  }

  function addToCart(product: Product) {
    const groups = product.modifierGroups ?? [];
    if (mustPickModifiersBeforeAdd(groups)) {
      openModifierPicker(product);
      return;
    }
    const displayName = pickLocalizedName(product, locale);
    pushCart(product, product.price, displayName, []);
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
  }

  function updateQty(cartKey: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.key === cartKey ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  async function submitOrder() {
    if (cart.length === 0 || !minOk) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId: initialCafe.id,
          type: orderType,
          source: "ONLINE",
          customerName: customerName || undefined,
          customerPhone,
          customerAddress: orderType === "DELIVERY" ? customerAddress : undefined,
          notes,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            modifierOptionIds: i.modifierOptionIds.length ? i.modifierOptionIds : undefined,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      setSuccess(data.orderNumber);
      setCart([]);
      window.Telegram?.WebApp?.MainButton?.hide();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg || tab !== "cart" || cart.length === 0) {
      tg?.MainButton?.hide();
      return;
    }
    tg.MainButton.setText(`${t.order} · ${formatPrice(total)}`);
    tg.MainButton.show();
    tg.MainButton.enable();
    const handler = () => submitOrder();
    tg.MainButton.onClick(handler);
    return () => tg.MainButton.offClick(handler);
  });

  if (success != null) {
    return (
      <div className="flex min-h-[var(--tg-viewport-height,100dvh)] flex-col items-center justify-center bg-white px-6 text-center">
        <div className="text-6xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">{t.success}</h1>
        <p className="mt-2 text-4xl font-black" style={{ color: accent }}>
          #{String(success).padStart(3, "0")}
        </p>
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            setTab("menu");
          }}
          className="mt-8 rounded-2xl px-8 py-3 font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          {t.openMenu}
        </button>
      </div>
    );
  }

  const showProductView = tab === "menu" && (selectedCategoryId != null || search.trim().length > 0);

  return (
    <div className="mx-auto flex min-h-[var(--tg-viewport-height,100dvh)] max-w-lg flex-col bg-stone-50 pb-24">
      {/* Header / search — menu tab */}
      {tab === "menu" && !showProductView && (
        <header className="sticky top-0 z-20 bg-white px-4 pb-3 pt-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-xl font-bold">{t.menu}</h1>
            <MenuLocaleSwitcher
              locale={locale}
              onChange={setLocale}
              variant="light"
              showLabel
              label={ui.lang}
            />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.search}
              className="w-full rounded-2xl bg-stone-100 py-3 pl-10 pr-4 text-sm outline-none ring-stone-300 focus:ring-2"
            />
          </div>
        </header>
      )}

      {showProductView && (
        <header className="relative overflow-hidden bg-stone-800 text-white">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80')",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          <div className="relative px-4 pb-4 pt-3">
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryId(null);
                setSearch("");
              }}
              className="mb-2 flex items-center gap-1 text-sm text-white/90"
            >
              <ChevronLeft className="h-4 w-4" />
              {t.menu}
            </button>
            <h1 className="text-2xl font-bold">
              {selectedCategory
                ? pickLocalizedName(selectedCategory, locale)
                : t.search}
            </h1>
          </div>
          <div className="relative flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  selectedCategoryId === cat.id
                    ? "bg-white text-stone-900"
                    : "bg-white/20 text-white"
                }`}
              >
                {pickLocalizedName(cat, locale)}
              </button>
            ))}
          </div>
        </header>
      )}

      <main className="flex-1 px-4 py-4">
        {tab === "home" && (
          <div className="space-y-4">
            <div
              className="rounded-3xl p-6 text-white"
              style={{ backgroundColor: accent }}
            >
              <p className="text-sm opacity-90">{t.orderVia}</p>
              <h2 className="mt-1 text-2xl font-bold">{t.welcome}</h2>
              <p className="mt-2 text-3xl font-black">{initialCafe.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setTab("menu")}
              className="w-full rounded-2xl py-4 font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              {t.openMenu}
            </button>
          </div>
        )}

        {tab === "cafe" && (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold">{initialCafe.name}</h2>
            {initialCafe.address && (
              <p className="mt-3 text-stone-600">{initialCafe.address}</p>
            )}
            {initialCafe.phone && (
              <a href={`tel:${initialCafe.phone}`} className="mt-2 block font-medium" style={{ color: accent }}>
                {initialCafe.phone}
              </a>
            )}
            <p className="mt-4 text-sm text-stone-500">
              ~{initialCafe.deliveryTimeMinutes} min
            </p>
          </div>
        )}

        {tab === "menu" && !showProductView && search.trim() === "" && (
          <div className="space-y-3">
            {categories.map((cat, idx) => {
              const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
              const firstProduct = cat.products[0];
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                  }}
                  className="relative flex w-full items-center overflow-hidden rounded-3xl p-5 text-left shadow-md"
                  style={{ backgroundColor: color.bg, minHeight: 120 }}
                >
                  <div className="relative z-10 max-w-[55%]">
                    <h3 className="text-lg font-bold text-white drop-shadow-sm">
                      {pickLocalizedName(cat, locale)}
                    </h3>
                    <p className="mt-1 text-xs text-white/90">
                      {cat.products.length} ta · ~{initialCafe.deliveryTimeMinutes} min
                    </p>
                  </div>
                  {firstProduct?.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={firstProduct.imageUrl}
                      alt=""
                      className="absolute -right-2 bottom-0 h-28 w-28 object-cover drop-shadow-lg"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {tab === "menu" && showProductView && (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => {
              const name = pickLocalizedName(product, locale);
              const desc = pickLocalizedDescription(product, locale);
              const isFav = favorites.has(product.id);
              return (
                <div
                  key={product.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >
                  <div className="relative">
                    <div className="relative aspect-square w-full overflow-hidden bg-stone-100">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-stone-300">
                          <Menu className="h-10 w-10" />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(product.id)}
                      className="absolute bottom-2 right-2 rounded-full bg-white/90 p-1.5 shadow"
                    >
                      <Heart
                        className={`h-4 w-4 ${isFav ? "fill-red-500 text-red-500" : "text-stone-400"}`}
                      />
                    </button>
                  </div>
                  <div className="flex border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      className="min-w-0 flex-1 p-3 text-left"
                    >
                      <p className="font-bold" style={{ color: accent }}>
                        {formatPrice(product.price)}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-sm font-medium text-stone-800">
                        {name}
                      </p>
                      {desc && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-400">{desc}</p>
                      )}
                    </button>
                    {hasModifierGroups(product.modifierGroups) && (
                      <button
                        type="button"
                        onClick={() => openModifierPicker(product)}
                        className="shrink-0 border-l border-stone-100 px-2 text-[10px] font-bold leading-tight"
                        style={{ color: accent }}
                      >
                        {ui.customize}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "cart" && (
          <div className="space-y-4">
            {cart.length === 0 ? (
              <div className="py-16 text-center text-stone-500">
                <ShoppingBasket className="mx-auto h-12 w-12 opacity-30" />
                <p className="mt-4 font-medium">{t.emptyCart}</p>
                <p className="text-sm">{t.addItems}</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  {(["TAKEAWAY", "DELIVERY"] as const).map((type) => {
                    if (type === "DELIVERY" && !initialCafe.deliveryEnabled) return null;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setOrderType(type)}
                        className={`flex-1 rounded-xl py-2.5 text-sm font-medium ${
                          orderType === type ? "text-white" : "bg-white text-stone-600"
                        }`}
                        style={orderType === type ? { backgroundColor: accent } : undefined}
                      >
                        {type === "TAKEAWAY" ? t.takeaway : t.delivery}
                      </button>
                    );
                  })}
                </div>

                {cart.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-2xl bg-white p-3 shadow-sm"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm" style={{ color: accent }}>
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQty(item.key, -1)}
                        className="h-8 w-8 rounded-full bg-stone-100"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.key, 1)}
                        className="h-8 w-8 rounded-full bg-stone-100"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}

                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={t.name}
                  className="w-full rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-sm"
                />
                <input
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={t.phone}
                  className="w-full rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-sm"
                />
                {orderType === "DELIVERY" && (
                  <input
                    required
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder={t.address}
                    className="w-full rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-sm"
                  />
                )}
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.notes}
                  className="w-full rounded-xl border-0 bg-white px-4 py-3 text-sm shadow-sm"
                />

                {initialCafe.minOrderAmountSom > 0 && (
                  <p className="text-xs text-stone-500">
                    {t.minOrder}: {initialCafe.minOrderAmountSom.toLocaleString()} so&apos;m
                  </p>
                )}
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  type="button"
                  onClick={submitOrder}
                  disabled={loading || !minOk || !customerPhone.trim()}
                  className="w-full rounded-2xl py-4 font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  {loading ? "..." : `${t.order} · ${formatPrice(total)}`}
                </button>
              </>
            )}
          </div>
        )}

        {tab === "more" && (
          <div className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
            <p className="font-semibold">{t.about}</p>
            <MenuLocaleSwitcher
              locale={locale}
              onChange={setLocale}
              variant="light"
              showLabel
              label={ui.lang}
            />
            <p className="text-sm text-stone-500">Nookline · Telegram Mini App</p>
          </div>
        )}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        <div className="mx-auto flex max-w-lg items-end justify-around">
          {(
            [
              { id: "home" as Tab, icon: Home, label: t.home },
              { id: "cafe" as Tab, icon: Store, label: t.cafe },
              { id: "menu" as Tab, icon: Menu, label: t.menu, center: true },
              { id: "cart" as Tab, icon: ShoppingBasket, label: t.cart, badge: cartCount },
              { id: "more" as Tab, icon: MoreHorizontal, label: t.more },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            if ("center" in item && item.center) {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className="-mt-6 flex flex-col items-center"
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-full shadow-lg"
                    style={{ backgroundColor: accent }}
                  >
                    <Icon className="h-7 w-7 text-white" strokeWidth={2.5} />
                  </span>
                  <span
                    className={`mt-1 text-[10px] font-medium ${active ? "text-stone-900" : "text-stone-400"}`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className="relative flex flex-col items-center px-2 py-1"
              >
                <Icon
                  className={`h-6 w-6 ${active ? "text-stone-900" : "text-stone-400"}`}
                  strokeWidth={active ? 2.5 : 2}
                />
                {"badge" in item && item.badge > 0 && (
                  <span
                    className="absolute -right-0 -top-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {item.badge}
                  </span>
                )}
                <span
                  className={`text-[10px] ${active ? "font-semibold text-stone-900" : "text-stone-400"}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
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
    </div>
  );
}
