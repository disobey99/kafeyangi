import type { CafeSuspendReason } from "@prisma/client";
import type { CustomerBlockVariant } from "@/lib/cafe-suspension";
import type { MenuLocale } from "@/lib/menu-i18n";

export type CafeBlockReason = "SUSPENDED" | "CANCELLED";

export function getCafeBlockReason(status: string): CafeBlockReason | null {
  if (status === "SUSPENDED") return "SUSPENDED";
  if (status === "CANCELLED") return "CANCELLED";
  return null;
}

export function isCafeCustomerAccessBlocked(status: string): boolean {
  return getCafeBlockReason(status) != null;
}

export type BlockedScreenCopy = {
  title: string;
  message: string;
  supportHint: string;
  activateLabel: string;
};

export function getBlockedScreenCopy(
  variant: CustomerBlockVariant,
  suspendReason: CafeSuspendReason | null,
  locale: MenuLocale = "uz",
): BlockedScreenCopy {
  const trial = suspendReason === "TRIAL";

  const copy: Record<
    CustomerBlockVariant,
    Record<MenuLocale, BlockedScreenCopy>
  > = {
    admin: {
      uz: {
        title: "Kafe vaqtincha yopiq",
        message:
          "Bu kafe platforma administratori tomonidan bloklangan. Menyu va buyurtmalar hozir mavjud emas.",
        supportHint: "Savollar uchun qo'llab-quvvatlash xizmatiga murojaat qiling.",
        activateLabel: "",
      },
      ru: {
        title: "Кафе временно закрыто",
        message:
          "Это кафе заблокировано администратором платформы. Меню и заказы сейчас недоступны.",
        supportHint: "По вопросам обратитесь в службу поддержки.",
        activateLabel: "",
      },
      en: {
        title: "Cafe temporarily closed",
        message:
          "This cafe has been blocked by the platform administrator. Menu and ordering are unavailable.",
        supportHint: "Please contact support for assistance.",
        activateLabel: "",
      },
    },
    billing: {
      uz: {
        title: trial ? "Sinov muddati tugadi" : "Obuna faol emas",
        message: trial
          ? "Bepul sinov muddati yakunlandi. Xizmatlar vaqtincha to'xtatilgan."
          : "Obuna to'lovi muddati o'tgan va 3 kun ichida to'lov amalga oshirilmagan. Xizmatlar vaqtincha to'xtatilgan.",
        supportHint:
          "Tarifni faollashtiring yoki qo'llab-quvvatlash bilan bog'laning.",
        activateLabel: "Tarifni faollashtirish",
      },
      ru: {
        title: trial ? "Пробный период истёк" : "Подписка неактивна",
        message: trial
          ? "Бесплатный пробный период завершён. Услуги временно приостановлены."
          : "Срок оплаты подписки истёк, оплата не поступила в течение 3 дней. Услуги временно приостановлены.",
        supportHint: "Активируйте тариф или свяжитесь с поддержкой.",
        activateLabel: "Активировать тариф",
      },
      en: {
        title: trial ? "Trial period ended" : "Subscription inactive",
        message: trial
          ? "The free trial has ended. Services are temporarily suspended."
          : "Subscription payment is overdue and was not paid within 3 days. Services are temporarily suspended.",
        supportHint: "Activate your plan or contact support.",
        activateLabel: "Activate plan",
      },
    },
  };

  return copy[variant][locale];
}

/** @deprecated Use getBlockedScreenCopy for full-page block UI */
export type CafeBlockedCopy = {
  title: string;
  message: string;
  restrictions: string[];
};

/** @deprecated */
export function getCafeBlockedCopy(
  reason: CafeBlockReason,
  locale: "uz" | "ru" | "en" = "uz",
): CafeBlockedCopy {
  const copy: Record<CafeBlockReason, Record<"uz" | "ru" | "en", CafeBlockedCopy>> = {
    SUSPENDED: {
      uz: {
        title: "Kafe vaqtincha yopiq",
        message: "Bu kafe hozir faol emas. Buyurtma va boshqa xizmatlar ishlamaydi.",
        restrictions: [
          "Onlayn buyurtma qabul qilinmaydi",
          "QR stol orqali buyurtma berib bo'lmaydi",
          "Ofitsiant chaqirish ishlamaydi",
        ],
      },
      ru: {
        title: "Кафе временно закрыто",
        message: "Это кафе сейчас неактивно. Заказы и другие услуги недоступны.",
        restrictions: [
          "Онлайн-заказ не принимается",
          "Заказ по QR со стола недоступен",
          "Вызов официанта недоступен",
        ],
      },
      en: {
        title: "Cafe temporarily closed",
        message: "This cafe is currently inactive. Ordering and other services are unavailable.",
        restrictions: [
          "Online ordering is disabled",
          "Table QR ordering is disabled",
          "Waiter call is disabled",
        ],
      },
    },
    CANCELLED: {
      uz: {
        title: "Kafe faol emas",
        message: "Bu kafe tizimdan o'chirilgan yoki obunasi bekor qilingan.",
        restrictions: [
          "Barcha buyurtmalar yopilgan",
          "Onlayn va stol buyurtmasi ishlamaydi",
        ],
      },
      ru: {
        title: "Кафе неактивно",
        message: "Это кафе удалено из системы или подписка отменена.",
        restrictions: [
          "Все заказы отключены",
          "Онлайн и столичные заказы недоступны",
        ],
      },
      en: {
        title: "Cafe is inactive",
        message: "This cafe has been removed or its subscription was cancelled.",
        restrictions: [
          "All ordering is disabled",
          "Online and table orders are unavailable",
        ],
      },
    },
  };

  return copy[reason][locale];
}
