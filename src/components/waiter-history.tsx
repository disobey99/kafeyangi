"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock, History, Printer, Wallet } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { debounce } from "@/lib/debounce";
import {
  printCashierReceiptForce,
  type CashierReceiptData,
} from "@/lib/receipt-print";
import { formatPrice } from "@/lib/utils";

type HistorySession = {
  id: string;
  tableNumber: number;
  closedAt: string;
  paymentMethod: string | null;
  orderCount: number;
  subtotal: number;
  discount: number;
  total: number;
  orders: {
    orderNumber: number;
    source: string;
    createdByName: string | null;
    notes: string | null;
    totalAmount: number;
    items: { quantity: number; name: string; unitPrice: number }[];
  }[];
};

function sessionToReceipt(
  session: HistorySession,
  cafeName: string,
): CashierReceiptData {
  return {
    cafeName,
    tableNumber: session.tableNumber,
    paymentMethod: session.paymentMethod || "CASH",
    orders: session.orders.map((o) => ({
      orderNumber: o.orderNumber,
      items: o.items,
      totalAmount: o.totalAmount,
    })),
    subtotal: session.subtotal,
    discount: session.discount,
    total: session.total,
    paidAt: session.closedAt,
  };
}

const HISTORY_TRANSLATIONS = {
  uz: {
    table: (n: number) => `Stol ${n}`,
    ordersCount: (n: number) => `${n} ta buyurtma`,
    staff: "Xodim",
    note: "Izoh",
    discount: "Chegirma",
    totalPayment: "Jami to'lov",
    historyTitle: "Yopilgan stollar tarixi",
    historySub: "Mijoz nima buyurtma qilgani va to'lov summasi",
    today: "Bugun",
    days7: "7 kun",
    tablePlaceholder: "Stol raqami",
    loading: "Yuklanmoqda...",
    noHistoryForTable: "Bu stol uchun tarix topilmadi",
    noHistoryYet: "Hali yopilgan stol yo'q",
    cashierHint: "Kassir stolni yopgach bu yerda ko'rinadi",
    reprint: "Chekni qayta chop etish",
    reprintOk: "Chek printerga yuborildi",
    reprintFail: "Chop etib bo'lmadi — brauzer pop-up ruxsatini tekshiring",
    cash: "Naqd",
    card: "Karta",
    payme: "Payme",
    click: "Click",
  },
  ru: {
    table: (n: number) => `Стол ${n}`,
    ordersCount: (n: number) => `${n} заказ(ов)`,
    staff: "Сотрудник",
    note: "Примечание",
    discount: "Скидка",
    totalPayment: "Итого к оплате",
    historyTitle: "История закрытых столов",
    historySub: "Что заказал клиент и сумма оплаты",
    today: "Сегодня",
    days7: "7 дней",
    tablePlaceholder: "Номер стола",
    loading: "Загрузка...",
    noHistoryForTable: "История для этого стола не найдена",
    noHistoryYet: "Нет закрытых столов",
    cashierHint: "Появится здесь после закрытия стола кассиром",
    reprint: "Перепечатать чек",
    reprintOk: "Чек отправлен на принтер",
    reprintFail: "Не удалось напечатать — разрешите всплывающие окна",
    cash: "Наличные",
    card: "Карта",
    payme: "Payme",
    click: "Click",
  },
  en: {
    table: (n: number) => `Table ${n}`,
    ordersCount: (n: number) => `${n} order(s)`,
    staff: "Staff",
    note: "Note",
    discount: "Discount",
    totalPayment: "Total payment",
    historyTitle: "Closed tables history",
    historySub: "What the customer ordered and the payment amount",
    today: "Today",
    days7: "7 days",
    tablePlaceholder: "Table number",
    loading: "Loading...",
    noHistoryForTable: "No history found for this table",
    noHistoryYet: "No closed tables yet",
    cashierHint: "Will appear here once cashier closes the table",
    reprint: "Reprint receipt",
    reprintOk: "Receipt sent to printer",
    reprintFail: "Print failed — allow pop-ups in the browser",
    cash: "Cash",
    card: "Card",
    payme: "Payme",
    click: "Click",
  }
};

function formatDateTime(iso: string, locale: "uz" | "ru" | "en") {
  return new Date(iso).toLocaleString(locale === "ru" ? "ru-RU" : locale === "en" ? "en-US" : "uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SessionCard({
  session,
  locale,
  cafeName,
}: {
  session: HistorySession;
  locale: "uz" | "ru" | "en";
  cafeName: string;
}) {
  const [open, setOpen] = useState(false);
  const [printMsg, setPrintMsg] = useState("");
  const t = HISTORY_TRANSLATIONS[locale];

  function reprint() {
    const ok = printCashierReceiptForce(sessionToReceipt(session, cafeName));
    setPrintMsg(ok ? t.reprintOk : t.reprintFail);
    window.setTimeout(() => setPrintMsg(""), 2500);
  }

  const payLabel = session.paymentMethod
    ? session.paymentMethod === "CASH"
      ? t.cash
      : session.paymentMethod === "CARD"
      ? t.card
      : session.paymentMethod === "PAYME"
      ? t.payme
      : session.paymentMethod === "CLICK"
      ? t.click
      : session.paymentMethod
    : "—";

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-lg font-black text-[var(--dp-accent)]">
              {t.table(session.tableNumber)}
            </span>
            <span className="text-xs text-[var(--dp-muted)]">
              {t.ordersCount(session.orderCount)}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--dp-muted)]">
            <Clock className="h-3 w-3" />
            {formatDateTime(session.closedAt, locale)}
            <span className="mx-1">·</span>
            <Wallet className="h-3 w-3" />
            {payLabel}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-bold text-[var(--dp-text)]">{formatPrice(session.total, locale)}</span>
          {open ? (
            <ChevronUp className="h-4 w-4 text-[var(--dp-muted)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--dp-muted)]" />
          )}
        </div>
      </button>

      {open && (
        <div
          className="space-y-3 border-t px-4 py-3"
          style={{ borderColor: "var(--dp-border)" }}
        >
          {session.orders.map((order) => (
            <div
              key={order.orderNumber}
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--dp-border)", background: "var(--dp-card)" }}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-[var(--dp-accent)]">
                  #{String(order.orderNumber).padStart(3, "0")}
                </span>
                <span className="font-medium text-[var(--dp-text)]">
                  {formatPrice(order.totalAmount, locale)}
                </span>
              </div>
              {order.createdByName && (
                <p className="mt-1 text-xs text-[var(--dp-muted)]">
                  {t.staff}: {order.createdByName}
                </p>
              )}
              <ul className="mt-2 space-y-1 text-sm text-[var(--dp-subtle)]">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span className="shrink-0 text-[var(--dp-muted)]">
                      {formatPrice(item.unitPrice * item.quantity, locale)}
                    </span>
                  </li>
                ))}
              </ul>
              {order.notes?.trim() && (
                <p className="mt-2 text-xs italic text-[var(--dp-muted)]">
                  {t.note}: {order.notes.trim()}
                </p>
              )}
            </div>
          ))}

          {session.discount > 0 && (
            <div className="flex justify-between text-sm text-emerald-500">
              <span>{t.discount}</span>
              <span>-{formatPrice(session.discount, locale)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 font-bold text-[var(--dp-text)]" style={{ borderColor: "var(--dp-border)" }}>
            <span>{t.totalPayment}</span>
            <span className="text-[var(--dp-accent)]">{formatPrice(session.total, locale)}</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reprint();
            }}
            className="btn btn-primary mt-1 flex w-full items-center justify-center gap-2 text-sm"
          >
            <Printer className="h-4 w-4" />
            {t.reprint}
          </button>
          {printMsg && (
            <p className="text-center text-xs text-[var(--dp-muted)]">{printMsg}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function WaiterHistory({
  cafeId,
  cafeName,
  locale = "uz",
}: {
  cafeId: string;
  cafeName: string;
  locale?: "uz" | "ru" | "en";
}) {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(1);
  const [tableFilter, setTableFilter] = useState("");
  const t = HISTORY_TRANSLATIONS[locale];

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ days: String(days) });
    if (tableFilter.trim()) params.set("table", tableFilter.trim());

    const res = await fetch(`/api/cafes/${cafeId}/waiter/history?${params}`);
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions ?? []);
    }
    setLoading(false);
  }, [cafeId, days, tableFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRef = useRef(load);
  loadRef.current = load;
  const loadDebounced = useRef(debounce(() => loadRef.current(), 400));

  useEffect(() => {
    return () => loadDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "table.updated") {
      loadDebounced.current();
    }
  });

  return (
    <section className="dp-card rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[var(--dp-accent)]" />
          <div>
            <h2 className="text-lg font-bold text-[var(--dp-text)]">{t.historyTitle}</h2>
            <p className="text-xs text-[var(--dp-muted)]">
              {t.historySub}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setDays(1)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            days === 1 ? "dp-nav-active" : "dp-nav-item"
          }`}
        >
          {t.today}
        </button>
        <button
          type="button"
          onClick={() => setDays(7)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
            days === 7 ? "dp-nav-active" : "dp-nav-item"
          }`}
        >
          {t.days7}
        </button>
        <input
          type="number"
          min={1}
          value={tableFilter}
          onChange={(e) => setTableFilter(e.target.value)}
          placeholder={t.tablePlaceholder}
          className="input w-28 text-sm"
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-[var(--dp-muted)]">{t.loading}</p>
      ) : sessions.length === 0 ? (
        <div className="py-10 text-center">
          <History className="mx-auto h-10 w-10 text-[var(--dp-muted)] opacity-40" />
          <p className="mt-3 text-sm text-[var(--dp-muted)]">
            {tableFilter ? t.noHistoryForTable : t.noHistoryYet}
          </p>
          <p className="mt-1 text-xs text-[var(--dp-muted)]">
            {t.cashierHint}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              locale={locale}
              cafeName={cafeName}
            />
          ))}
        </div>
      )}
    </section>
  );
}
