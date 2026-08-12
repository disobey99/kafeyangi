"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { ProductMenuImage } from "@/components/product-menu-image";
import {
  ProductModifierPicker,
  type ModifierGroup,
} from "@/components/product-modifier-picker";
import { hasModifierGroups, mustPickModifiersBeforeAdd } from "@/lib/modifiers";
import { formatPrice } from "@/lib/utils";
import {
  getAutoPrintKitchen,
  printMultipleKitchenReceipts,
  splitKitchenReceiptsByStation,
} from "@/lib/receipt-print";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  modifierGroups?: ModifierGroup[];
};

type Category = { id: string; name: string; products: Product[] };

type CartItem = {
  key: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  modifierOptionIds: string[];
};

export function CashierCounterOrder({
  cafeId,
  cafeName,
  onOrderCreated,
}: {
  cafeId: string;
  cafeName: string;
  onOrderCreated?: () => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const catsRef = useRef<HTMLDivElement>(null);

  const syncCatScroll = useCallback(() => {
    const el = catsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  function scrollCats(dir: -1 | 1) {
    const el = catsRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.55), behavior: "smooth" });
  }

  const loadMenu = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/waiter/menu`);
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories ?? []);
    }
  }, [cafeId]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    const el = catsRef.current;
    if (!el) return;
    syncCatScroll();
    el.addEventListener("scroll", syncCatScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncCatScroll) : null;
    ro?.observe(el);
    window.addEventListener("resize", syncCatScroll);
    return () => {
      el.removeEventListener("scroll", syncCatScroll);
      ro?.disconnect();
      window.removeEventListener("resize", syncCatScroll);
    };
  }, [categories, syncCatScroll]);

  function addToCart(product: Product) {
    if (!product.isAvailable) return;
    if (mustPickModifiersBeforeAdd(product.modifierGroups ?? [])) {
      setPickerProduct(product);
      return;
    }
    pushCart(product, product.price, product.name, []);
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

  function clearCart() {
    setCart([]);
    setNotes("");
    setError("");
  }

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  const visibleProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.flatMap((cat) =>
      cat.products
        .filter((product) => {
          if (activeCategoryId && cat.id !== activeCategoryId) return false;
          if (!q) return true;
          return (
            product.name.toLowerCase().includes(q) ||
            (product.description ?? "").toLowerCase().includes(q)
          );
        })
        .map((product) => ({ ...product, categoryName: cat.name })),
    );
  }, [categories, activeCategoryId, searchQuery]);

  const activeCategoryName =
    activeCategoryId == null
      ? "Barcha taomlar"
      : categories.find((c) => c.id === activeCategoryId)?.name ?? "Taomlar";

  async function submitOrder() {
    if (cart.length === 0) return;
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeId,
          type: "TAKEAWAY",
          source: "CASHIER",
          notes: notes.trim() || undefined,
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

      const orderId = data.id as string;
      const orderNumber = data.orderNumber as number;

      if (getAutoPrintKitchen()) {
        const receipts = splitKitchenReceiptsByStation(
          {
            cafeName,
            orderNumber,
            notes: notes.trim() || null,
            createdAt: new Date().toISOString(),
          },
          (data.items ?? []).map(
            (i: {
              quantity: number;
              name: string;
              prepStationId?: string | null;
              prepStationName?: string | null;
            }) => ({
              quantity: i.quantity,
              name: i.name,
              prepStationId: i.prepStationId,
              prepStationName: i.prepStationName,
            }),
          ),
        );
        if (receipts.length === 0) {
          printMultipleKitchenReceipts([
            {
              cafeName,
              orderNumber,
              items: cart.map((i) => ({ quantity: i.quantity, name: i.name })),
              notes: notes.trim() || null,
              createdAt: new Date().toISOString(),
            },
          ]);
        } else {
          printMultipleKitchenReceipts(receipts);
        }
      }

      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });

      setSuccess(orderNumber);
      setCart([]);
      setNotes("");
      onOrderCreated?.();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  if (success != null) {
    return (
      <div className="cc-sale-success">
        <div className="cc-sale-success-icon">
          <Check className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <p className="cc-sale-success-num">#{String(success).padStart(3, "0")}</p>
        <p className="cc-sale-success-title">Buyurtma oshxonaga yuborildi</p>
        <p className="cc-sale-success-sub">Olib ketish · kassadan</p>
        <button type="button" onClick={() => setSuccess(null)} className="cc-sale-submit">
          Yangi buyurtma
        </button>
      </div>
    );
  }

  return (
    <div className="cc-sale">
      <div className="cc-sale-menu">
        <div className="cc-sale-toolbar">
          <label className="cc-sale-search">
            <Search className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Taom qidirish…"
              autoComplete="off"
            />
          </label>
          <p className="cc-sale-count">
            {visibleProducts.length} ta · {activeCategoryName}
          </p>
        </div>

        <div className="cc-sale-cats-wrap">
          <button
            type="button"
            className="cc-sale-cats-nav"
            onClick={() => scrollCats(-1)}
            disabled={!canScrollLeft}
            aria-label="Chapga"
            title="Chapga"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div
            ref={catsRef}
            className="cc-sale-cats"
            role="tablist"
            aria-label="Kategoriyalar"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategoryId === null}
              onClick={() => setActiveCategoryId(null)}
              className={`cc-sale-cat ${activeCategoryId === null ? "is-active" : ""}`}
            >
              Hammasi
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={activeCategoryId === cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`cc-sale-cat ${activeCategoryId === cat.id ? "is-active" : ""}`}
              >
                {cat.name}
                <span className="cc-sale-cat-n">{cat.products.length}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="cc-sale-cats-nav"
            onClick={() => scrollCats(1)}
            disabled={!canScrollRight}
            aria-label="O'ngga"
            title="O'ngga"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="cc-sale-list">
          {visibleProducts.length === 0 ? (
            <div className="cc-sale-empty-menu">
              <UtensilsCrossed className="h-8 w-8 opacity-40" />
              <p>Taom topilmadi</p>
            </div>
          ) : (
            visibleProducts.map((product) => {
              const qtyInCart = cart
                .filter((c) => c.productId === product.id)
                .reduce((s, c) => s + c.quantity, 0);
              return (
                <div
                  key={`${product.categoryName}-${product.id}`}
                  className={`cc-sale-row ${!product.isAvailable ? "is-unavailable" : ""}`}
                >
                  <button
                    type="button"
                    disabled={!product.isAvailable}
                    onClick={() => addToCart(product)}
                    className="cc-sale-row-main"
                  >
                    <div className="cc-sale-row-img">
                      <ProductMenuImage
                        url={product.imageUrl}
                        name={product.name}
                        size="md"
                      />
                    </div>
                    <div className="cc-sale-row-body">
                      <div className="cc-sale-row-top">
                        <p className="cc-sale-row-name">{product.name}</p>
                        {!product.isAvailable && (
                          <span className="cc-sale-badge-off">Yo&apos;q</span>
                        )}
                        {qtyInCart > 0 && (
                          <span className="cc-sale-badge-qty">{qtyInCart}</span>
                        )}
                      </div>
                      {product.description && (
                        <p className="cc-sale-row-desc">{product.description}</p>
                      )}
                      <p className="cc-sale-row-price">{formatPrice(product.price)}</p>
                    </div>
                  </button>
                  <div className="cc-sale-row-actions">
                    {hasModifierGroups(product.modifierGroups) && (
                      <button
                        type="button"
                        disabled={!product.isAvailable}
                        className="cc-sale-var"
                        onClick={() => setPickerProduct(product)}
                      >
                        Variant
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={!product.isAvailable}
                      className="cc-sale-add"
                      aria-label={`${product.name} qo'shish`}
                      onClick={() => addToCart(product)}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <aside className="cc-sale-cart">
        <div className="cc-sale-cart-head">
          <div>
            <h3>
              <ShoppingBag className="h-4 w-4" />
              Savat
              {itemCount > 0 && <span className="cc-sale-cart-badge">{itemCount}</span>}
            </h3>
            <p>Olib ketish — kassadan</p>
          </div>
          {cart.length > 0 && (
            <button type="button" onClick={clearCart} className="cc-sale-clear" title="Tozalash">
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="cc-sale-cart-empty">
            <ShoppingBag className="h-10 w-10 opacity-30" />
            <p>Chapdan taom tanlang</p>
            <span>Tez qo&apos;shish uchun qatorni bosing</span>
          </div>
        ) : (
          <>
            <ul className="cc-sale-cart-list">
              {cart.map((item) => (
                <li key={item.key} className="cc-sale-cart-item">
                  <div className="cc-sale-cart-item-main">
                    <p className="cc-sale-cart-item-name">{item.name}</p>
                    <p className="cc-sale-cart-item-sum">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                  <div className="cc-sale-cart-item-meta">
                    <span className="cc-sale-cart-unit">{formatPrice(item.price)} ×</span>
                    <div className="cc-sale-qty">
                      <button type="button" onClick={() => updateQty(item.key, -1)} aria-label="Kamaytirish">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => updateQty(item.key, 1)} aria-label="Ko'paytirish">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Izoh (ixtiyoriy)"
              rows={2}
              className="cc-sale-notes"
            />

            <div className="cc-sale-total">
              <span>Jami</span>
              <strong>{formatPrice(total)}</strong>
            </div>

            {error && <p className="cc-sale-error">{error}</p>}

            <button
              type="button"
              disabled={loading}
              onClick={() => void submitOrder()}
              className="cc-sale-submit"
            >
              {loading ? "Yuborilmoqda…" : "Oshxonaga yuborish"}
            </button>
          </>
        )}
      </aside>

      {pickerProduct && (
        <ProductModifierPicker
          productName={pickerProduct.name}
          basePrice={pickerProduct.price}
          groups={pickerProduct.modifierGroups ?? []}
          locale="uz"
          onCancel={() => setPickerProduct(null)}
          onConfirm={(optionIds, totalUnitPrice, summary) => {
            const baseName = pickerProduct.name;
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
