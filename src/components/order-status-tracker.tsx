"use client";

import { useCallback, useEffect, useState } from "react";
import {
  OrderStatusAnimation,
  resolveOrderAnimPhase,
} from "@/components/order-status-animation";
import { formatPrice, ORDER_STATUS_LABELS } from "@/lib/utils";
import { Star, Phone } from "lucide-react";
import type { MenuLocale } from "@/lib/menu-i18n";

const TRACKER_UI = {
  uz: {
    pending: "Buyurtmangiz yuborildi — tasdiq kutilmoqda",
    confirmed: "Buyurtma qabul qilindi",
    preparing: "Taomlar tayyorlanmoqda",
    eta: (minutes: number) => `Yetkazuvchi yo'lda — taxminan ${minutes} daqiqada yetib boradi`,
    onWay: "Yetkazuvchi yo'lda — tez orada yetib boradi",
    waitingCourier: "Taom tayyor — yetkazuvchi qabul qilishi kutilmoqda",
    readySelf: "Buyurtmangiz tayyor! Olib boring",
    readyTakeaway: "Buyurtmangiz tayyor! Olib keting",
    delivered: "Yoqimli ishtaha!",
    cancelled: "Buyurtma bekor qilindi",
    cancelledLabel: "Bekor qilindi",
    courierLabel: "Yetkazib beruvchi (Kuryer)",
    callCourier: "Kuryerga qo'ng'iroq qilish",
    hide: "Yashirish",
    showItems: "Nimalar buyurtma qilingan?",
    receipt: "Chek",
    total: "Jami",
    rateTitle: "Baholang",
    rateSubtitle: "Yetkazishdan mamnunmisiz? Yulduzcha va fikr qoldiring.",
    commentPlaceholder: "Fikringiz (ixtiyoriy)",
    sending: "Yuborilmoqda…",
    send: "Yuborish",
    selectStar: "Yulduzcha tanlang",
    sendError: "Yuborilmadi",
    networkError: "Tarmoq xatosi",
    thanks: "Rahmat!",
  },
  ru: {
    pending: "Ваш заказ отправлен — ожидается подтверждение",
    confirmed: "Заказ принят",
    preparing: "Блюда готовятся",
    eta: (minutes: number) => `Курьер в пути — прибудет примерно через ${minutes} мин`,
    onWay: "Курьер в пути — скоро будет",
    waitingCourier: "Блюдо готово — ожидается принятие курьером",
    readySelf: "Ваш заказ готов! Заберите",
    readyTakeaway: "Ваш заказ готов! Заберите с собой",
    delivered: "Приятного аппетита!",
    cancelled: "Заказ отменён",
    cancelledLabel: "Отменён",
    courierLabel: "Доставщик (Курьер)",
    callCourier: "Позвонить курьеру",
    hide: "Скрыть",
    showItems: "Что заказано?",
    receipt: "Чек",
    total: "Итого",
    rateTitle: "Оцените",
    rateSubtitle: "Довольны доставкой? Оставьте звезду и отзыв.",
    commentPlaceholder: "Ваш отзыв (необязательно)",
    sending: "Отправка…",
    send: "Отправить",
    selectStar: "Выберите звезду",
    sendError: "Не отправлено",
    networkError: "Ошибка сети",
    thanks: "Спасибо!",
  },
  en: {
    pending: "Your order has been sent — awaiting confirmation",
    confirmed: "Order accepted",
    preparing: "Dishes are being prepared",
    eta: (minutes: number) => `Courier is on the way — arriving in about ${minutes} min`,
    onWay: "Courier is on the way — arriving soon",
    waitingCourier: "Food is ready — waiting for courier to accept",
    readySelf: "Your order is ready! Please take it",
    readyTakeaway: "Your order is ready! Please pick it up",
    delivered: "Enjoy your meal!",
    cancelled: "Order was cancelled",
    cancelledLabel: "Cancelled",
    courierLabel: "Delivery Person (Courier)",
    callCourier: "Call courier",
    hide: "Hide",
    showItems: "What was ordered?",
    receipt: "Receipt",
    total: "Total",
    rateTitle: "Rate us",
    rateSubtitle: "Are you satisfied with the delivery? Leave a star and review.",
    commentPlaceholder: "Your feedback (optional)",
    sending: "Sending…",
    send: "Send",
    selectStar: "Select a star",
    sendError: "Failed to send",
    networkError: "Network error",
    thanks: "Thank you!",
  },
};

type TrackedItem = {
  quantity: number;
  product: { name: string };
};

type TrackedReview = {
  score: number;
  comment: string | null;
  createdAt?: string;
};

type TrackedCourier = {
  name: string;
  phone: string | null;
  avatarUrl: string | null;
};

type TrackedOrder = {
  id: string;
  orderNumber: number;
  status: string;
  statusLabel: string;
  serviceMode?: string;
  type?: string;
  totalAmount?: number;
  notes?: string | null;
  courierClaimed?: boolean;
  assignedCourierId?: string | null;
  assignedCourier?: TrackedCourier | null;
  items?: TrackedItem[];
  review?: TrackedReview | null;
};

const STATUS_FLOW = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"];

function statusHint(order: TrackedOrder, locale: MenuLocale): string {
  const t = TRACKER_UI[locale] || TRACKER_UI.uz;
  if (order.status === "PENDING") return t.pending;
  if (order.status === "CONFIRMED") return t.confirmed;
  if (order.status === "PREPARING") return t.preparing;
  if (order.status === "READY") {
    if (order.type === "DELIVERY") {
      const notes = order.notes || "";
      const match = notes.match(/\[ETA:\s*(\d+)\]/);
      const eta = match ? parseInt(match[1], 10) : null;
      if (eta) {
        return t.eta(eta);
      }
      return order.courierClaimed || order.assignedCourierId
        ? t.onWay
        : t.waitingCourier;
    }
    if (order.serviceMode === "SELF") return t.readySelf;
    return t.readyTakeaway;
  }
  if (order.status === "DELIVERED") return t.delivered;
  if (order.status === "CANCELLED") return t.cancelled;
  return ORDER_STATUS_LABELS[order.status] ?? order.status;
}

export function OrderStatusTracker({
  tableId,
  qrToken,
  visitToken,
  orderId,
  accent = "#2AC1BC",
  showAnimation = true,
  reviewPhone,
  locale = "uz",
}: {
  tableId?: string;
  qrToken?: string;
  visitToken?: string | null;
  orderId?: string;
  accent?: string;
  showAnimation?: boolean;
  reviewPhone?: string;
  locale?: MenuLocale;
}) {
  const [orders, setOrders] = useState<TrackedOrder[]>([]);

  const load = useCallback(async () => {
    if (orderId) {
      const res = await fetch(`/api/orders/${orderId}/track`);
      const data = await res.json();
      if (data.order) setOrders([data.order]);
      return;
    }
    if (tableId && qrToken && visitToken) {
      const params = new URLSearchParams({ token: qrToken, visitToken });
      const res = await fetch(`/api/tables/${tableId}/guest-session?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.sessionClosed) {
        setOrders([]);
        return;
      }
      setOrders(data.activeOrders ?? []);
    }
  }, [tableId, qrToken, visitToken, orderId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  if (orders.length === 0) return null;

  return (
    <div className={orderId ? "space-y-0" : "space-y-3 px-4 py-3"}>
      {orders.map((order) => (
        <OrderStatusCard
          key={order.id}
          order={order}
          accent={accent}
          showAnimation={showAnimation}
          flush={Boolean(orderId)}
          reviewPhone={reviewPhone}
          locale={locale}
          onReviewSaved={load}
        />
      ))}
    </div>
  );
}

function OrderStatusCard({
  order,
  accent,
  showAnimation,
  flush = false,
  reviewPhone,
  locale,
  onReviewSaved,
}: {
  order: TrackedOrder;
  accent: string;
  showAnimation: boolean;
  flush?: boolean;
  reviewPhone?: string;
  locale: MenuLocale;
  onReviewSaved?: () => void;
}) {
  const [showReceipt, setShowReceipt] = useState(false);
  const currentStep = STATUS_FLOW.indexOf(order.status);
  const phase = resolveOrderAnimPhase(
    order.status,
    order.type,
    Boolean(order.courierClaimed || order.assignedCourierId),
  );
  const isDelivered = order.status === "DELIVERED";
  const isCancelled = order.status === "CANCELLED";
  const t = TRACKER_UI[locale] || TRACKER_UI.uz;
  const badgeLabel = isCancelled ? t.cancelledLabel : order.statusLabel;

  return (
    <div
      className={
        flush
          ? "overflow-hidden"
          : "overflow-hidden rounded-2xl shadow-sm"
      }
      style={{ background: "var(--da-card, #ffffff)" }}
    >
      {showAnimation && (
        <OrderStatusAnimation
          phase={phase}
          accent={isCancelled ? "#ef4444" : accent}
          onViewReceipt={
            isDelivered ? () => setShowReceipt((v) => !v) : undefined
          }
        />
      )}
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className="font-bold"
            style={{ color: isCancelled ? "#dc2626" : accent }}
          >
            #{String(order.orderNumber).padStart(3, "0")}
          </span>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={
              isCancelled
                ? {
                    background: "color-mix(in srgb, #ef4444 18%, var(--da-card, #fff))",
                    color: "#f87171",
                  }
                : {
                    background: `color-mix(in srgb, ${accent} 22%, var(--da-card, #fff))`,
                    color: accent,
                  }
            }
          >
            {badgeLabel}
          </span>
        </div>
        <p className="mt-1.5 text-sm" style={{ color: "var(--da-muted, #78716c)" }}>
          {statusHint(order, locale)}
        </p>
        {!isCancelled && (
        <div className="mt-3 flex gap-1.5">
          {STATUS_FLOW.slice(0, -1).map((step, i) => (
            <div
              key={step}
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  i <= currentStep ? "w-full" : "w-0"
                }`}
                style={{ background: accent }}
              />
            </div>
          ))}
        </div>
        )}

        {/* Courier Info Block */}
        {!isDelivered && order.type === "DELIVERY" && order.assignedCourier && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-teal-50/50 border border-teal-100/60 p-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              {order.assignedCourier.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={order.assignedCourier.avatarUrl}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-full bg-teal-100 text-teal-700 font-extrabold text-sm border-2 border-white shadow-sm">
                  {order.assignedCourier.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-teal-600/90">{t.courierLabel}</p>
                <p className="text-sm font-black text-stone-800 mt-0.5">{order.assignedCourier.name}</p>
                {order.assignedCourier.phone && (
                  <p className="text-xs font-bold text-stone-500 mt-0.5">{order.assignedCourier.phone}</p>
                )}
              </div>
            </div>
            {order.assignedCourier.phone && (
              <a
                href={`tel:${order.assignedCourier.phone.replace(/\s+/g, "")}`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500 text-white shadow-md shadow-teal-500/20 hover:bg-teal-600 transition active:scale-95"
                title={t.callCourier}
              >
                <Phone className="h-5 w-5" />
              </a>
            )}
          </div>
        )}

        {!isDelivered && order.items && order.items.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowReceipt((v) => !v)}
            className="mt-3 text-xs font-bold"
            style={{ color: accent }}
          >
            {showReceipt ? t.hide : t.showItems}
          </button>
        ) : null}

        {showReceipt && (
          <div className="mt-3 rounded-xl bg-stone-50 px-3 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400">
              {t.receipt}
            </p>
            <ul className="mt-2 space-y-1.5">
              {(order.items ?? []).map((item, idx) => (
                <li
                  key={`${item.product.name}-${idx}`}
                  className="flex justify-between gap-3 text-sm text-stone-800"
                >
                  <span>
                    {item.quantity}× {item.product.name}
                  </span>
                </li>
              ))}
            </ul>
            {typeof order.totalAmount === "number" ? (
              <p className="mt-3 border-t border-stone-200 pt-2 text-right text-sm font-extrabold text-stone-900">
                {t.total}: {formatPrice(order.totalAmount)}
              </p>
            ) : null}
          </div>
        )}

        {isDelivered && reviewPhone ? (
          <OrderReviewForm
            orderId={order.id}
            accent={accent}
            phone={reviewPhone}
            existing={order.review ?? null}
            locale={locale}
            onSaved={onReviewSaved}
          />
        ) : null}
      </div>
    </div>
  );
}

function OrderReviewForm({
  orderId,
  accent,
  phone,
  existing,
  locale,
  onSaved,
}: {
  orderId: string;
  accent: string;
  phone: string;
  existing: TrackedReview | null;
  locale: MenuLocale;
  onSaved?: () => void;
}) {
  const [score, setScore] = useState(existing?.score ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(Boolean(existing));
  const t = TRACKER_UI[locale] || TRACKER_UI.uz;

  if (done) {
    const shownScore = existing?.score ?? score;
    const shownComment = existing?.comment ?? comment;
    return (
      <div
        className="mt-4 rounded-xl px-3 py-3"
        style={{
          background: "color-mix(in srgb, #f59e0b 14%, var(--da-card, #fffbeb))",
        }}
      >
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              className={`h-5 w-5 ${
                n <= shownScore
                  ? "fill-amber-400 text-amber-400"
                  : "text-stone-300"
              }`}
            />
          ))}
        </div>
        {shownComment ? (
          <p className="mt-2 text-sm" style={{ color: "var(--da-muted)" }}>
            {shownComment}
          </p>
        ) : (
          <p className="mt-2 text-sm font-medium" style={{ color: "var(--da-muted)" }}>
            {t.thanks}
          </p>
        )}
      </div>
    );
  }

  async function submit() {
    if (score < 1) {
      setError(t.selectStar);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          comment: comment.trim() || undefined,
          phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t.sendError);
        return;
      }
      setDone(true);
      onSaved?.();
    } catch {
      setError(t.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="mt-4 rounded-xl border px-3 py-3"
      style={{
        borderColor: "var(--da-border, #e7e5e4)",
        background: "var(--da-input, #f5f5f4)",
      }}
    >
      <p className="text-sm font-extrabold" style={{ color: "var(--da-ink)" }}>
        {t.rateTitle}
      </p>
      <p className="mt-0.5 text-xs" style={{ color: "var(--da-muted)" }}>
        {t.rateSubtitle}
      </p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            className="p-0.5"
            aria-label={`${n} star`}
          >
            <Star
              className={`h-7 w-7 ${
                n <= score ? "fill-amber-400 text-amber-400" : "text-stone-300"
              }`}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder={t.commentPlaceholder}
        className="mt-3 w-full resize-none rounded-xl border px-3 py-2 text-sm outline-none"
        style={{
          borderColor: "var(--da-border, #e7e5e4)",
          background: "var(--da-card, #fff)",
          color: "var(--da-ink)",
        }}
      />
      {error ? <p className="mt-1 text-sm text-red-500">{error}</p> : null}
      <button
        type="button"
        disabled={loading}
        onClick={submit}
        className="mt-2 w-full rounded-xl py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
        style={{ background: accent }}
      >
        {loading ? t.sending : t.send}
      </button>
    </div>
  );
}
