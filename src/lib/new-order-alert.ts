/** Kassa / xodim — yangi buyurtma ovozi va nutq (uz/ru/en) */

import { getStaffAlertLocale, type StaffAlertLocale } from "@/lib/staff-alert-locale";

function playTone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  duration: number,
  volume = 0.25,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  osc.connect(gain);
  gain.connect(ctx.destination);

  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  osc.start(startAt);
  osc.stop(startAt + duration);
}

/** Qisqa "ding-ding" — musiqa emas, bildirishnoma signali */
export function playOrderChime(ctx: AudioContext) {
  const t = ctx.currentTime;
  playTone(ctx, 660, t, 0.15);
  playTone(ctx, 880, t + 0.18, 0.15);
  playTone(ctx, 1100, t + 0.36, 0.2);
}

function langTag(locale: StaffAlertLocale): string {
  if (locale === "ru") return "ru-RU";
  if (locale === "en") return "en-US";
  return "uz-UZ";
}

function buildOrderSpeech(
  orderNumber: number | undefined,
  locale: StaffAlertLocale,
): { text: string; lang: string } {
  const lang = langTag(locale);
  if (locale === "ru") {
    return orderNumber != null
      ? { text: `Новый заказ. Номер ${orderNumber}.`, lang }
      : { text: "Новый заказ", lang };
  }
  if (locale === "en") {
    return orderNumber != null
      ? { text: `New order. Number ${orderNumber}.`, lang }
      : { text: "New order", lang };
  }
  return orderNumber != null
    ? { text: `Yangi buyurtma. Raqam ${orderNumber}.`, lang }
    : { text: "Yangi buyurtma", lang };
}

function buildWaiterCallSpeech(
  tableNumber: number,
  locale: StaffAlertLocale,
): { text: string; lang: string } {
  const lang = langTag(locale);
  if (locale === "ru") {
    return { text: `Вызов официанта. Стол ${tableNumber}.`, lang };
  }
  if (locale === "en") {
    return { text: `Waiter called. Table ${tableNumber}.`, lang };
  }
  return { text: `Ofitsiant chaqirildi. Stol ${tableNumber}.`, lang };
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const prefix = lang.slice(0, 2).toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("ru")) ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
    voices[0]
  );
}

function speakText(text: string, lang: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  const speak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voice = pickVoice(lang);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  };

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    speak();
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      speak();
    };
  }
}

export function speakNewOrder(orderNumber?: number, locale?: StaffAlertLocale) {
  const loc = locale ?? getStaffAlertLocale();
  const { text, lang } = buildOrderSpeech(orderNumber, loc);
  speakText(text, lang);
}

export function playNewOrderAlert(
  ctx: AudioContext,
  options?: { orderNumber?: number; withVoice?: boolean; locale?: StaffAlertLocale },
) {
  playOrderChime(ctx);
  if (options?.withVoice !== false) {
    setTimeout(
      () => speakNewOrder(options?.orderNumber, options?.locale),
      400,
    );
  }
}

export function speakWaiterCall(tableNumber: number, locale?: StaffAlertLocale) {
  const loc = locale ?? getStaffAlertLocale();
  const { text, lang } = buildWaiterCallSpeech(tableNumber, loc);
  speakText(text, lang);
}

/** Ofitsiant chaqiruvi — boshqa ohang */
export function playWaiterCallAlert(
  ctx: AudioContext,
  tableNumber: number,
  locale?: StaffAlertLocale,
) {
  const t = ctx.currentTime;
  playTone(ctx, 440, t, 0.2);
  playTone(ctx, 440, t + 0.25, 0.2);
  playTone(ctx, 440, t + 0.5, 0.25);
  setTimeout(() => speakWaiterCall(tableNumber, locale), 400);
}

export function orderAlertCopy(
  orderNumber: number | undefined,
  locale?: StaffAlertLocale,
) {
  const loc = locale ?? getStaffAlertLocale();
  const { text } = buildOrderSpeech(orderNumber, loc);
  const title =
    loc === "ru" ? "Новый заказ" : loc === "en" ? "New order" : "Yangi buyurtma";
  return { title, body: text };
}

export function waiterCallAlertCopy(
  tableNumber: number,
  locale?: StaffAlertLocale,
) {
  const loc = locale ?? getStaffAlertLocale();
  const { text } = buildWaiterCallSpeech(tableNumber, loc);
  const title =
    loc === "ru"
      ? "Вызов официанта"
      : loc === "en"
        ? "Waiter call"
        : "Ofitsiant chaqirildi";
  return { title, body: text };
}

