"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CreditCard, Pencil, Printer, Search, Wallet } from "lucide-react";
import {
  printCashierReceipt,
  printCashierReceiptForce,
  type CashierReceiptData,
} from "@/lib/receipt-print";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { useOffline } from "@/hooks/use-offline";
import { debounce } from "@/lib/debounce";
import { addPendingAction, getBillCache, getOpenTablesCache, saveBillCache, saveOpenTablesCache } from "@/lib/offline-store";
import { formatPrice } from "@/lib/utils";
import { TableOrderManager } from "@/components/table-order-manager";
import { TableWaiterReassign } from "@/components/table-waiter-reassign";

type OpenTable = {
  id: string;
  number: number;
  status: string;
  orderCount: number;
  total: number;
};

type BillOrder = {
  id: string;
  orderNumber: number;
  status: string;
  totalAmount: number;
  createdByName?: string;
  items: { id: string; quantity: number; name: string; unitPrice: number; isNewAddition?: boolean }[];
};

type Bill = {
  table: {
    id: string;
    number: number;
    status: string;
    assignedWaiter?: { id: string; name: string } | null;
  };
  orders: BillOrder[];
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  orderCount: number;
  loyaltyPhones?: string[];
};

type TableView = "edit" | "pay";

export function TableCheckout({
  cafeId,
  cafeName,
  onClosed,
  preselectTableNumber,
  preselectKey,
  onPreselectHandled,
  defaultView = "edit",
}: {
  cafeId: string;
  cafeName: string;
  onClosed?: () => void;
  preselectTableNumber?: number | null;
  preselectKey?: number;
  onPreselectHandled?: () => void;
  defaultView?: TableView;
}) {
  const [tableNumber, setTableNumber] = useState("");
  const [view, setView] = useState<TableView>(defaultView);
  const [openTables, setOpenTables] = useState<OpenTable[]>([]);
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [useCashback, setUseCashback] = useState(false);
  const [cashbackInfo, setCashbackInfo] = useState<{
    phone: string;
    cashbackSom: number;
    canRedeemCashback: boolean;
  } | null>(null);
  const { online, refreshPending } = useOffline();

  const loadOpenTables = useCallback(async () => {
    if (!navigator.onLine) {
      const cached = await getOpenTablesCache(cafeId);
      if (cached) {
        setOpenTables(cached as OpenTable[]);
        return;
      }
    }
    const res = await fetch(`/api/cafes/${cafeId}/table-bill`);
    const data = await res.json();
    const tables = data.tables ?? [];
    setOpenTables(tables);
    if (navigator.onLine) {
      await saveOpenTablesCache(cafeId, tables);
    }
  }, [cafeId]);

  const loadBill = useCallback(async (num: number) => {
    if (Number.isNaN(num) || num < 1) {
      setBill(null);
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!navigator.onLine) {
        const cached = await getBillCache(cafeId, num);
        if (cached) {
          setBill(cached as Bill);
          setError("Offline: saqlangan hisob ko'rsatilmoqda");
          return;
        }
        setError("Offline: bu stol uchun saqlangan hisob yo'q");
        setBill(null);
        return;
      }

      const res = await fetch(`/api/cafes/${cafeId}/table-bill?number=${num}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Xatolik");
        setBill(null);
        return;
      }

      setBill(data.bill);
      await saveBillCache(cafeId, num, data.bill);
      setUseCashback(false);
      setCashbackInfo(null);
      const phone =
        data.bill.loyaltyPhones?.length === 1 ? data.bill.loyaltyPhones[0] : null;
      if (phone) {
        fetch(`/api/cafes/${cafeId}/loyalty?phone=${encodeURIComponent(phone)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d) {
              setCashbackInfo({
                phone,
                cashbackSom: d.cashbackSom ?? 0,
                canRedeemCashback: d.canRedeemCashback ?? false,
              });
            }
          });
      }
    } catch {
      setError("Ulanish xatosi");
      setBill(null);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  const tableNumberRef = useRef(tableNumber);
  tableNumberRef.current = tableNumber;

  useEffect(() => {
    loadOpenTables();
  }, [loadOpenTables]);

  useEffect(() => {
    if (preselectTableNumber != null && preselectTableNumber >= 1) {
      setView(defaultView);
      selectTable(preselectTableNumber);
      onPreselectHandled?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preselectKey forces re-open
  }, [preselectTableNumber, preselectKey, defaultView]);

  const refreshRef = useRef({ loadOpenTables, loadBill });
  refreshRef.current = { loadOpenTables, loadBill };
  const refreshDebounced = useRef(
    debounce(() => {
      refreshRef.current.loadOpenTables();
      const num = parseInt(tableNumberRef.current, 10);
      if (!Number.isNaN(num) && num >= 1) refreshRef.current.loadBill(num);
    }, 400),
  );

  useEffect(() => {
    return () => refreshDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (
      event.type === "order.created" ||
      event.type === "order.updated" ||
      event.type === "table.updated"
    ) {
      refreshDebounced.current();
    }
  });

  function selectTable(num: number) {
    setTableNumber(String(num));
    setView(defaultView);
    loadBill(num);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadBill(parseInt(tableNumber, 10));
  }

  const [saving, setSaving] = useState(false);

  async function saveEdits(goToPay = false) {
    const num = parseInt(tableNumber, 10);
    if (Number.isNaN(num) || num < 1) return;

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await loadBill(num);
      await loadOpenTables();
      setSuccess("Buyurtma saqlandi");
      if (goToPay) setView("pay");
    } finally {
      setSaving(false);
    }
  }

  function billToReceipt(bill: Bill, paymentMethod: "CASH" | "CARD"): CashierReceiptData {
    return {
      cafeName,
      tableNumber: bill.table.number,
      paymentMethod,
      orders: bill.orders.map((o) => ({
        orderNumber: o.orderNumber,
        items: o.items,
        totalAmount: o.totalAmount,
      })),
      subtotal: bill.subtotal,
      discount: bill.discount,
      serviceFee: bill.serviceFee,
      total: bill.total,
    };
  }

  async function closeTable(paymentMethod: "CASH" | "CARD") {
    if (!bill || bill.orderCount === 0) return;

    setPaying(true);
    setError("");
    setSuccess("");

    const receiptData = billToReceipt(bill, paymentMethod);

    try {
      if (!online) {
        printCashierReceipt(receiptData);
        await addPendingAction({
          type: "TABLE_CLOSE",
          payload: {
            cafeId,
            tableNumber: bill.table.number,
            paymentMethod,
          },
        });
        await refreshPending();
        const methodLabel = paymentMethod === "CASH" ? "Naqd" : "Karta";
        setSuccess(
          `Offline: Stol ${bill.table.number} navbatga qo'yildi (${methodLabel}). Internet qaytganida yuboriladi.`
        );
        setBill(null);
        setTableNumber("");
        onClosed?.();
        return;
      }

      const res = await fetch(`/api/cafes/${cafeId}/table-bill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: bill.table.number,
          paymentMethod,
          useCashback: useCashback && Boolean(cashbackInfo?.canRedeemCashback),
          customerPhone: cashbackInfo?.phone,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }

      printCashierReceipt(receiptData);

      const methodLabel = paymentMethod === "CASH" ? "Naqd" : "Karta";
      setSuccess(
        `Stol ${data.tableNumber} yopildi — ${formatPrice(data.total)} (${methodLabel})`
      );
      setBill(null);
      setTableNumber("");
      loadOpenTables();
      onClosed?.();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setPaying(false);
    }
  }

  return (
    <section className="dp-card mb-8 overflow-hidden rounded-2xl">
      <div className="dp-section-bar px-5 py-4">
        <h2 className="text-lg font-bold text-[var(--dp-bar-text)]">Stol boshqaruvi</h2>
        <p className="dp-bar-muted mt-0.5 text-sm">
          Buyurtmani tahrirlash yoki to&apos;lov va stolni yopish
        </p>
      </div>

      <div className="p-5">
        {openTables.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {openTables.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTable(t.number)}
                className="rounded-xl border px-3 py-2 text-sm font-medium transition"
                style={
                  tableNumber === String(t.number)
                    ? {
                        borderColor: "var(--dp-tab-active-bg)",
                        background: "var(--dp-tab-active-bg)",
                        color: "var(--dp-tab-active-text)",
                      }
                    : {
                        borderColor: "var(--dp-border)",
                        background: "var(--dp-input-bg)",
                        color: "var(--dp-subtle)",
                      }
                }
              >
                Stol {t.number} · {formatPrice(t.total)}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSearch} className="mt-4 flex gap-2">
          <input
            type="number"
            min={1}
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="Stol raqami"
            className="input w-32"
          />
          <button type="submit" disabled={loading} className="btn btn-secondary gap-2">
            <Search className="h-4 w-4" />
            {loading ? "..." : "Ko'rish"}
          </button>
        </form>

        {error && (
          <p className="mt-3 rounded-lg px-3 py-2 text-sm text-red-500" style={{ background: "rgba(239,68,68,0.1)" }}>
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 rounded-lg px-3 py-2 text-sm text-emerald-600" style={{ background: "rgba(16,185,129,0.1)" }}>
            {success}
          </p>
        )}

        {bill?.table && (
          <nav className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setView("edit")}
              className={`cashier-tab ${view === "edit" ? "cashier-tab-active" : ""}`}
            >
              <Pencil className="h-4 w-4" />
              Tahrirlash
            </button>
            <button
              type="button"
              onClick={() => setView("pay")}
              disabled={!bill || bill.orderCount === 0}
              className={`cashier-tab ${view === "pay" ? "cashier-tab-active" : ""} disabled:opacity-40`}
            >
              <Wallet className="h-4 w-4" />
              To&apos;lov
            </button>
          </nav>
        )}

        {bill?.table && view === "edit" && (
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ borderColor: "var(--dp-accent)", background: "var(--dp-accent-soft)" }}
          >
            <h3 className="text-lg font-bold text-[var(--dp-text)]">
              Stol {bill.table.number} — buyurtmani tahrirlash
            </h3>
            <p className="mt-1 text-sm text-[var(--dp-muted)]">
              Taom miqdorini <strong>− / +</strong> bilan o&apos;zgartiring, yangi taom qo&apos;shing yoki
              buyurtmani bekor qiling. Tugagach <strong>Saqlash</strong> ni bosing.
            </p>
          </div>
        )}

        {bill?.table && (
          <div className="mt-4">
            <TableWaiterReassign
              cafeId={cafeId}
              tableId={bill.table.id}
              currentWaiter={bill.table.assignedWaiter ?? null}
              onChanged={() => {
                const num = parseInt(tableNumber, 10);
                if (!Number.isNaN(num) && num >= 1) void loadBill(num);
                void loadOpenTables();
              }}
            />
          </div>
        )}

        {bill?.table && view === "edit" && (
          <div className="mt-4">
            <TableOrderManager
              key={bill.table.id}
              cafeId={cafeId}
              tableId={bill.table.id}
              fullMenu
              ordersOverride={bill.orders.map((o) => ({
                id: o.id,
                orderNumber: o.orderNumber,
                status: o.status,
                totalAmount: o.totalAmount,
                createdByName: o.createdByName,
                notes: null,
                items: o.items,
              }))}
              onChanged={() => {
                const num = parseInt(tableNumber, 10);
                if (!Number.isNaN(num) && num >= 1) loadBill(num);
                loadOpenTables();
              }}
            />

            <div
              className="sticky bottom-3 z-20 mt-4 flex flex-col gap-2 rounded-2xl border p-3 shadow-lg sm:flex-row sm:items-center"
              style={{
                borderColor: "var(--dp-border)",
                background: "var(--dp-card)",
              }}
            >
              <p className="min-w-0 flex-1 text-xs text-[var(--dp-muted)] sm:text-sm">
                O&apos;zgarishlar darhol yoziladi. Tahrirni yakunlash uchun saqlang.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => saveEdits(false)}
                  className="btn btn-primary gap-2 px-5 py-2.5"
                >
                  <Check className="h-4 w-4" />
                  {saving ? "Saqlanmoqda..." : "Saqlash"}
                </button>
                {bill.orderCount > 0 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => saveEdits(true)}
                    className="btn btn-secondary gap-2 px-5 py-2.5"
                  >
                    <Wallet className="h-4 w-4" />
                    Saqlash va to&apos;lov
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {bill && bill.orderCount > 0 && view === "pay" && (
          <div
            className="mt-4 rounded-xl border p-4"
            style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--dp-text)]">
                Stol {bill.table.number} — to&apos;lov
              </h3>
              <span className="text-xs text-[var(--dp-muted)]">
                {bill.orderCount} ta buyurtma
              </span>
            </div>

            <ul className="mt-4 space-y-3">
              {bill.orders.map((order) => (
                <li
                  key={order.id}
                  className="rounded-lg border p-3 text-sm"
                  style={{ borderColor: "var(--dp-border)", background: "var(--dp-card)" }}
                >
                  <p className="font-semibold text-[var(--dp-accent)]">
                    #{String(order.orderNumber).padStart(3, "0")}
                    {order.createdByName && (
                      <span className="ml-2 font-normal text-[var(--dp-muted)]">
                        {order.createdByName}
                      </span>
                    )}
                  </p>
                  <ul className="mt-2 space-y-1 text-[var(--dp-subtle)]">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span>{formatPrice(item.unitPrice * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            {bill.discount > 0 && (
              <div className="mt-4 flex justify-between text-sm text-emerald-500">
                <span>Chegirma</span>
                <span>-{formatPrice(bill.discount)}</span>
              </div>
            )}

            {bill.serviceFee > 0 && (
              <div className="mt-2 flex justify-between text-sm text-[var(--dp-subtle)]">
                <span>Ofitsiant xizmat foizi</span>
                <span>{formatPrice(bill.serviceFee)}</span>
              </div>
            )}

            {cashbackInfo && cashbackInfo.cashbackSom > 0 && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm" style={{ borderColor: "var(--dp-border)" }}>
                <input
                  type="checkbox"
                  checked={useCashback}
                  disabled={!cashbackInfo.canRedeemCashback}
                  onChange={(e) => setUseCashback(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium text-[var(--dp-text)]">
                    Keshbek ishlatish ({cashbackInfo.cashbackSom.toLocaleString("uz-UZ")} so&apos;m)
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--dp-muted)]">
                    {cashbackInfo.phone}
                    {!cashbackInfo.canRedeemCashback && " — bu davrda ishlatib bo'lmaydi"}
                  </span>
                </span>
              </label>
            )}

            {useCashback && cashbackInfo?.canRedeemCashback && (
              <div className="mt-2 flex justify-between text-sm text-emerald-500">
                <span>Keshbek chegirmasi</span>
                <span>
                  -{formatPrice(Math.min(cashbackInfo.cashbackSom * 100, bill.total))}
                </span>
              </div>
            )}

            <div
              className="mt-4 flex items-center justify-between border-t pt-4"
              style={{ borderColor: "var(--dp-border)" }}
            >
              <span className="text-lg font-bold text-[var(--dp-text)]">Jami</span>
              <span className="text-2xl font-black text-[var(--dp-accent)]">
                {formatPrice(
                  useCashback && cashbackInfo?.canRedeemCashback
                    ? Math.max(0, bill.total - cashbackInfo.cashbackSom * 100)
                    : bill.total,
                )}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={paying}
                onClick={() => printCashierReceiptForce(billToReceipt(bill, "CASH"))}
                className="btn btn-secondary gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Naqd chek
              </button>
              <button
                type="button"
                disabled={paying}
                onClick={() => printCashierReceiptForce(billToReceipt(bill, "CARD"))}
                className="btn btn-secondary gap-1.5 text-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Karta chek
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={paying}
                onClick={() => closeTable("CASH")}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                <Wallet className="h-4 w-4" />
                Naqd — stolni yopish
              </button>
              <button
                type="button"
                disabled={paying}
                onClick={() => closeTable("CARD")}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4" />
                Karta — stolni yopish
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
