export type StaffAlertLocale = "uz" | "ru" | "en";

export const ALERT_LOCALE_KEY = "kafe-alert-locale";
export const WAITER_LOCALE_KEY = "waiter_locale";

const LABELS: Record<StaffAlertLocale, string> = {
  uz: "O‘zbek",
  ru: "Русский",
  en: "English",
};

export function alertLocaleLabels() {
  return LABELS;
}

export function isStaffAlertLocale(value: string | null | undefined): value is StaffAlertLocale {
  return value === "uz" || value === "ru" || value === "en";
}

/** Xodim ovoz / bildirishnoma tili (waiter_locale bilan sinxron) */
export function getStaffAlertLocale(): StaffAlertLocale {
  if (typeof window === "undefined") return "uz";
  const alert = localStorage.getItem(ALERT_LOCALE_KEY);
  if (isStaffAlertLocale(alert)) return alert;
  const waiter = localStorage.getItem(WAITER_LOCALE_KEY);
  if (isStaffAlertLocale(waiter)) return waiter;
  return "uz";
}

export function setStaffAlertLocale(locale: StaffAlertLocale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(ALERT_LOCALE_KEY, locale);
  localStorage.setItem(WAITER_LOCALE_KEY, locale);
  window.dispatchEvent(
    new CustomEvent("kafe:alert-locale", { detail: { locale } }),
  );
}
