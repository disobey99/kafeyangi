"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Trash2, XCircle } from "lucide-react";
import { ProductMenuImage } from "@/components/product-menu-image";
import {
  ProductModifierPicker,
  type ModifierGroup,
} from "@/components/product-modifier-picker";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { debounce } from "@/lib/debounce";
import { hasModifierGroups, mustPickModifiersBeforeAdd } from "@/lib/modifiers";
import { formatPrice, ORDER_STATUS_LABELS } from "@/lib/utils";

type TableOrder = {
  id: string;
  orderNumber: number;
  status: string;
  totalAmount: number;
  createdByName?: string;
  notes: string | null;
  items: { id: string; quantity: number; unitPrice: number; name: string; isNewAddition?: boolean }[];
};

type TableInfo = {
  id: string;
  number: number;
  assignedWaiter: { id: string; name: string } | null;
};

type Product = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  imageUrl?: string | null;
  isAvailable: boolean;
  modifierGroups?: ModifierGroup[];
};

type Category = { id: string; name: string; products: Product[] };

export function TableOrderManager({
  cafeId,
  tableId,
  onAppendToOrder,
  activeAppendOrderId,
  showQuickAdd = false,
  fullMenu = false,
  ordersOverride,
  onChanged,
  readOnly = false,
}: {
  cafeId: string;
  tableId: string;
  onAppendToOrder?: (orderId: string | null) => void;
  activeAppendOrderId?: string | null;
  showQuickAdd?: boolean;
  fullMenu?: boolean;
  ordersOverride?: TableOrder[];
  onChanged?: () => void;
  readOnly?: boolean;
}) {
  const [table, setTable] = useState<TableInfo | null>(null);
  const [fetchedOrders, setFetchedOrders] = useState<TableOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quickAddOrderId, setQuickAddOrderId] = useState<string>("");
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const menuEnabled = showQuickAdd || fullMenu;
  const useBillOrders = ordersOverride != null;
  const orders = useBillOrders ? ordersOverride : fetchedOrders;

  const load = useCallback(async () => {
    if (useBillOrders) {
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/tables/${tableId}/active-orders`);
    if (res.ok) {
      const data = await res.json();
      setTable(data.table ?? null);
      setFetchedOrders(data.orders ?? []);
    }
    setLoading(false);
  }, [tableId, useBillOrders]);

  useEffect(() => {
    if (useBillOrders) {
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
  }, [load, tableId, useBillOrders]);

  const loadRef = useRef(load);
  loadRef.current = load;
  const useBillOrdersRef = useRef(useBillOrders);
  useBillOrdersRef.current = useBillOrders;
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const loadDebounced = useRef(
    debounce(() => {
      if (!useBillOrdersRef.current) loadRef.current();
      else onChangedRef.current?.();
    }, 400),
  );

  useEffect(() => {
    return () => loadDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (
      event.type !== "order.created" &&
      event.type !== "order.updated" &&
      event.type !== "table.updated"
    ) {
      return;
    }
    loadDebounced.current();
  });

  useEffect(() => {
    if (!menuEnabled) return;
    fetch(`/api/cafes/${cafeId}/waiter/menu`)
      .then((r) => r.json())
      .then((d) => {
        const cats: Category[] = d.categories ?? [];
        setCategories(cats);
        const list: Product[] = [];
        for (const c of cats) {
          for (const p of c.products ?? []) list.push(p);
        }
        setProducts(list);
      });
  }, [cafeId, menuEnabled]);

  useEffect(() => {
    if (orders.length && !quickAddOrderId) {
      setQuickAddOrderId(orders[orders.length - 1].id);
    }
  }, [orders, quickAddOrderId]);

  async function afterChange() {
    if (useBillOrders) {
      onChanged?.();
      return;
    }
    await load();
    onChanged?.();
  }

  async function addProductToOrder(
    product: Product,
    modifierOptionIds: string[] = [],
  ) {
    if (!product.isAvailable) return;

    setBusy(product.id);
    try {
      let targetId = quickAddOrderId || orders[orders.length - 1]?.id;

      if (!targetId) {
        const createRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cafeId,
            tableId,
            type: "DINE_IN",
            source: "CASHIER",
            items: [
              {
                productId: product.id,
                quantity: 1,
                modifierOptionIds: modifierOptionIds.length ? modifierOptionIds : undefined,
              },
            ],
          }),
        });
        if (!createRes.ok) return;
        const created = await createRes.json();
        targetId = created.id as string;
        await fetch(`/api/orders/${targetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "CONFIRMED" }),
        });
      } else {
        const res = await fetch(`/api/orders/${targetId}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                productId: product.id,
                quantity: 1,
                modifierOptionIds: modifierOptionIds.length ? modifierOptionIds : undefined,
              },
            ],
          }),
        });
        if (!res.ok) return;
      }

      await afterChange();
    } finally {
      setBusy(null);
    }
  }

  function handleProductClick(product: Product) {
    if (!product.isAvailable) return;
    if (mustPickModifiersBeforeAdd(product.modifierGroups ?? [])) {
      setPickerProduct(product);
      return;
    }
    addProductToOrder(product);
  }

  async function updateQty(orderId: string, itemId: string, quantity: number) {
    setBusy(itemId);
    try {
      const res = await fetch(`/api/orders/${orderId}/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (res.ok) await afterChange();
    } finally {
      setBusy(null);
    }
  }

  async function cancelOrder(orderId: string) {
    if (!confirm("Buyurtmani bekor qilasizmi?")) return;
    setBusy(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (res.ok) {
        if (activeAppendOrderId === orderId) onAppendToOrder?.(null);
        await afterChange();
      }
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-[var(--dp-muted)]">Stol buyurtmalari yuklanmoqda...</p>;
  }

  return (
    <div className="space-y-4">
      {table?.assignedWaiter && (
        <p className="text-xs text-[var(--dp-muted)]">
          Ofitsiant:{" "}
          <strong className="text-[var(--dp-text)]">{table.assignedWaiter.name}</strong>
        </p>
      )}

      {orders.length === 0 ? (
        <p
          className="rounded-xl border border-dashed px-4 py-3 text-sm text-[var(--dp-muted)]"
          style={{ borderColor: "var(--dp-border)" }}
        >
          Bu stolda ochiq buyurtma yo&apos;q. Pastdan taom tanlab yangi buyurtma oching.
        </p>
      ) : (
        orders.map((order) => (
          <div
            key={order.id}
            className={`rounded-xl border p-4 ${
              activeAppendOrderId === order.id ? "ring-2 ring-[var(--dp-accent)]" : ""
            }`}
            style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <span className="font-bold text-[var(--dp-accent)]">
                  #{String(order.orderNumber).padStart(3, "0")}
                </span>
                <span className="ml-2 text-xs text-[var(--dp-muted)]">
                  {ORDER_STATUS_LABELS[order.status] ?? order.status}
                </span>
                {order.createdByName && (
                  <p className="text-xs text-[var(--dp-muted)]">{order.createdByName}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {onAppendToOrder && (
                  <button
                    type="button"
                    onClick={() =>
                      onAppendToOrder(activeAppendOrderId === order.id ? null : order.id)
                    }
                    className={`btn text-xs ${activeAppendOrderId === order.id ? "btn-primary" : "btn-secondary"}`}
                  >
                    {activeAppendOrderId === order.id ? "Tanlangan" : "Qo'shish"}
                  </button>
                )}
                {!readOnly && (
                  <button
                    type="button"
                    disabled={busy === order.id}
                    onClick={() => cancelOrder(order.id)}
                    className="btn btn-secondary gap-1 text-xs text-red-600"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Bekor
                  </button>
                )}
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
                  style={{ background: "var(--dp-card)" }}
                >
                  <span className="min-w-0 flex-1 text-[var(--dp-subtle)]">
                    {item.name}
                    {item.isNewAddition && (
                      <span className="ml-1.5 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-600">
                        yangi
                      </span>
                    )}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {readOnly ? (
                      <span className="text-sm font-bold text-[var(--dp-muted)] mr-2">
                        {item.quantity} ta
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={busy === item.id}
                          onClick={() => updateQty(order.id, item.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border"
                          style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                          title="Kamaytirish"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          disabled={busy === item.id}
                          onClick={() => updateQty(order.id, item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border"
                          style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                          title="Ko'paytirish"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy === item.id}
                          onClick={() => updateQty(order.id, item.id, 0)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border text-red-600"
                          style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                          title="O'chirish"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <span className="ml-1 w-20 text-right text-sm font-semibold">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-right text-sm font-semibold text-[var(--dp-text)]">
              {formatPrice(order.totalAmount)}
            </p>
          </div>
        ))
      )}

      {!readOnly && menuEnabled && (fullMenu ? categories.length > 0 : products.length > 0) && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--dp-border)", background: "var(--dp-card)" }}
        >
          <p className="mb-1 text-base font-bold text-[var(--dp-text)]">Taom qo&apos;shish</p>
          <p className="mb-3 text-xs text-[var(--dp-muted)]">
            Tanlangan buyurtmaga yangi taom qo&apos;shiladi
          </p>
          {orders.length > 1 && (
            <select
              value={quickAddOrderId}
              onChange={(e) => setQuickAddOrderId(e.target.value)}
              className="input mb-3 w-full text-sm"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  #{String(o.orderNumber).padStart(3, "0")}
                </option>
              ))}
            </select>
          )}

          {fullMenu ? (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div key={cat.id}>
                  <p className="mb-2 text-sm font-semibold text-[var(--dp-text)]">{cat.name}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {cat.products.map((product) => (
                      <div
                        key={product.id}
                        className="flex overflow-hidden rounded-xl border"
                        style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
                      >
                        <button
                          type="button"
                          disabled={!product.isAvailable || busy === product.id}
                          onClick={() => handleProductClick(product)}
                          className="flex min-w-0 flex-1 items-center gap-2 p-2.5 text-left disabled:opacity-40"
                        >
                          <ProductMenuImage url={product.imageUrl ?? null} name={product.name} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{product.name}</p>
                            <p className="text-xs font-semibold text-[var(--dp-accent)]">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                        </button>
                        {hasModifierGroups(product.modifierGroups) && (
                          <button
                            type="button"
                            onClick={() => setPickerProduct(product)}
                            className="border-l px-2 text-[10px] font-bold text-[var(--dp-accent)]"
                            style={{ borderColor: "var(--dp-border)" }}
                          >
                            Var
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={!p.isAvailable || busy === p.id}
                  onClick={() => handleProductClick(p)}
                  className="rounded-lg border px-2 py-1.5 text-xs disabled:opacity-40"
                  style={{ borderColor: "var(--dp-border)" }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {pickerProduct && (
        <ProductModifierPicker
          productName={pickerProduct.name}
          basePrice={pickerProduct.price}
          groups={pickerProduct.modifierGroups ?? []}
          locale="uz"
          onCancel={() => setPickerProduct(null)}
          onConfirm={(optionIds) => {
            addProductToOrder(pickerProduct, optionIds);
            setPickerProduct(null);
          }}
        />
      )}
    </div>
  );
}
