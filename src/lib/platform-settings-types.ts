export type PlanId = "STARTER" | "STANDARD" | "PRO";

/** Obuna narxlari ko‘rinishi — admin tanlaydi */
export type PlanCurrency = "USD" | "UZS";

export type PlanDiscountConfig = {
  enabled: boolean;
  percent: number;
  validFrom: string;
  validTo: string;
};

export type PlatformSettings = {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  socialInstagram: string;
  socialTelegram: string;
  socialFacebook: string;
  notifyNewCustomer: boolean;
  notifyPaymentOverdue: boolean;
  notifyWeeklyReport: boolean;
  supportPhone: string;
  supportTelegram: string;
  supportInstagram: string;
  supportTitle: string;
  planCurrency: PlanCurrency;
  planPrices: Record<PlanId, number>;
  planDiscounts: Record<PlanId, PlanDiscountConfig>;
};
