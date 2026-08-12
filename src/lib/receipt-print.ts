import { formatPrice } from "@/lib/utils";

const RECEIPT_CSS = `
  @page { size: 80mm auto; margin: 3mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: "Courier New", Courier, monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    background: #fff;
    width: 72mm;
    padding: 2mm;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .lg { font-size: 14px; }
  .xl { font-size: 18px; font-weight: bold; }
  .muted { color: #444; }
  .line { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 4px; }
  .item { margin: 3px 0; }
  .note { margin-top: 6px; font-style: italic; }
  @media print {
    body { width: 72mm; }
  }
`;

export type KitchenReceiptData = {
  cafeName: string;
  orderNumber: number;
  tableNumber?: number;
  stationName?: string;
  items: { quantity: number; name: string }[];
  notes?: string | null;
  createdAt?: string;
};

export type CashierReceiptData = {
  cafeName: string;
  tableNumber: number;
  paymentMethod: "CASH" | "CARD" | "PAYME" | "CLICK" | string;
  orders: {
    orderNumber: number;
    items: { quantity: number; name: string; unitPrice: number }[];
    totalAmount: number;
  }[];
  subtotal: number;
  discount: number;
  serviceFee?: number;
  total: number;
  /** Qayta chop / yopilgan sessiyada asl to'lov vaqti */
  paidAt?: string | null;
};

function formatTime(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildKitchenReceiptHtml(data: KitchenReceiptData): string {
  const num = String(data.orderNumber).padStart(3, "0");
  const tableLine = data.tableNumber != null ? `Stol ${data.tableNumber}` : "Olib ketish / Yetkazish";
  const title = data.stationName?.trim()
    ? escapeHtml(data.stationName.trim().toUpperCase())
    : "OSHXONA CHEKI";

  const itemsHtml = data.items
    .map(
      (i) =>
        `<div class="item row"><span class="bold">${i.quantity}x</span><span>${escapeHtml(i.name)}</span></div>`
    )
    .join("");

  const notesHtml = data.notes?.trim()
    ? `<div class="line"></div><div class="note bold">IZOH: ${escapeHtml(data.notes.trim())}</div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} #${num}</title><style>${RECEIPT_CSS}</style></head><body>
    <div class="center bold lg">${title}</div>
    <div class="center muted">${escapeHtml(data.cafeName)}</div>
    <div class="line"></div>
    <div class="center xl">#${num}</div>
    <div class="center bold">${escapeHtml(tableLine)}</div>
    <div class="center muted">${formatTime(data.createdAt)}</div>
    <div class="line"></div>
    ${itemsHtml}
    ${notesHtml}
    <div class="line"></div>
    <div class="center bold">TAYYORLANG!</div>
  </body></html>`;
}

function cashierPayLabel(method: string): string {
  switch (method) {
    case "CASH":
      return "NAQD";
    case "CARD":
      return "KARTA";
    case "PAYME":
      return "PAYME";
    case "CLICK":
      return "CLICK";
    default:
      return method || "—";
  }
}

export function buildCashierReceiptHtml(data: CashierReceiptData): string {
  const payLabel = cashierPayLabel(data.paymentMethod);

  let itemsHtml = "";
  for (const order of data.orders) {
    itemsHtml += `<div class="muted">#${String(order.orderNumber).padStart(3, "0")}</div>`;
    for (const item of order.items) {
      const sum = item.unitPrice * item.quantity;
      itemsHtml += `<div class="item row"><span>${item.quantity}x ${escapeHtml(item.name)}</span><span>${formatPrice(sum)}</span></div>`;
    }
  }

  const discountHtml =
    data.discount > 0
      ? `<div class="row"><span>Chegirma</span><span>-${formatPrice(data.discount)}</span></div>`
      : "";

  const serviceFeeHtml =
    (data.serviceFee ?? 0) > 0
      ? `<div class="row"><span>Ofitsiant xizmat foizi</span><span>${formatPrice(data.serviceFee!)}</span></div>`
      : "";

  const reprintNote = data.paidAt
    ? `<div class="center muted">QAYTA CHOP</div>`
    : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Chek Stol ${data.tableNumber}</title><style>${RECEIPT_CSS}</style></head><body>
    <div class="center bold lg">${escapeHtml(data.cafeName)}</div>
    <div class="center muted">KASSA CHEKI</div>
    ${reprintNote}
    <div class="line"></div>
    <div class="row"><span class="bold">Stol</span><span class="bold lg">${data.tableNumber}</span></div>
    <div class="row"><span>To'lov</span><span class="bold">${payLabel}</span></div>
    <div class="row"><span>Sana</span><span>${formatTime(data.paidAt ?? undefined)}</span></div>
    <div class="line"></div>
    ${itemsHtml}
    <div class="line"></div>
    ${discountHtml}
    ${serviceFeeHtml}
    <div class="row bold lg"><span>JAMI</span><span>${formatPrice(data.total)}</span></div>
    <div class="line"></div>
    <div class="center">Xaridingiz uchun rahmat!</div>
    <div class="center muted">Nookline</div>
  </body></html>`;
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printReceiptHtml(html: string): boolean {
  if (typeof window === "undefined") return false;

  const iframe = document.createElement("iframe");
  iframe.setAttribute(
    "style",
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none",
  );
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return printReceiptHtmlPopup(html);
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 800);
    }
  };

  win.onload = () => {
    doPrint();
  };

  // Ba'zi brauzerlarda onload ishlamaydi — faqat hali chop etilmagan bo'lsa
  setTimeout(doPrint, 300);

  return true;
}

function printReceiptHtmlPopup(html: string): boolean {
  const win = window.open("", "_blank", "width=420,height=640");
  if (!win) {
    window.alert("Pop-up bloklandi. Chek chop etish uchun brauzerda ruxsat bering.");
    return false;
  }

  win.document.open();
  win.document.write(html);
  win.document.close();

  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    win.focus();
    win.print();
    setTimeout(() => win.close(), 400);
  };

  win.onload = () => {
    doPrint();
  };
  setTimeout(doPrint, 300);

  return true;
}

export function printMultipleKitchenReceipts(data: KitchenReceiptData[]) {
  if (data.length === 0) return false;
  if (data.length === 1) return printReceiptHtml(buildKitchenReceiptHtml(data[0]));

  const bodies = data
    .map((item, index) => {
      const single = buildKitchenReceiptHtml(item);
      const body = single.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? "";
      const breakStyle =
        index < data.length - 1 ? ' style="page-break-after:always"' : "";
      return `<div${breakStyle}>${body}</div>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Oshxona</title><style>${RECEIPT_CSS}</style></head><body>${bodies}</body></html>`;
  return printReceiptHtml(html);
}

export function printKitchenReceipt(data: KitchenReceiptData) {
  if (!getAutoPrintKitchen()) return false;
  return printReceiptHtml(buildKitchenReceiptHtml(data));
}

export function printCashierReceipt(data: CashierReceiptData) {
  if (!getAutoPrintCashier()) return false;
  return printReceiptHtml(buildCashierReceiptHtml(data));
}

/** Qo'lda chop — avto-sozlamadan qat'i nazar */
export function printKitchenReceiptForce(data: KitchenReceiptData) {
  return printReceiptHtml(buildKitchenReceiptHtml(data));
}

export function printCashierReceiptForce(data: CashierReceiptData) {
  return printReceiptHtml(buildCashierReceiptHtml(data));
}

export type ZReportReceiptData = {
  cafeName: string;
  date: string;
  orderCount: number;
  totalRevenue: number;
  totalDiscount: number;
  avgCheck: number;
  byPayment: { method: string; revenue: number; orders: number }[];
  bySource?: { source: string; revenue: number; orders: number }[];
  expectedCash: number;
  actualCash?: number | null;
  variance?: number | null;
  cashierName?: string | null;
  note?: string | null;
};

const PAY_PRINT: Record<string, string> = {
  CASH: "NAQD",
  CARD: "KARTA",
  PAYME: "PAYME",
  OTHER: "BOSHQA",
};

const SOURCE_PRINT: Record<string, string> = {
  QR_TABLE: "QR",
  ONLINE: "ONLINE",
  WAITER: "OFITSIANT",
  CASHIER: "KASSIR",
};

export function buildZReportReceiptHtml(data: ZReportReceiptData): string {
  const payRows = data.byPayment
    .filter((p) => p.orders > 0 || p.revenue > 0)
    .map(
      (p) =>
        `<div class="row"><span>${PAY_PRINT[p.method] ?? p.method} (${p.orders})</span><span>${formatPrice(p.revenue)}</span></div>`,
    )
    .join("");

  const sourceRows = (data.bySource ?? [])
    .filter((s) => s.orders > 0)
    .map(
      (s) =>
        `<div class="row"><span>${SOURCE_PRINT[s.source] ?? s.source}</span><span>${formatPrice(s.revenue)}</span></div>`,
    )
    .join("");

  const varianceBlock =
    data.actualCash != null
      ? `<div class="line"></div>
         <div class="row"><span>Kutilgan naqd</span><span>${formatPrice(data.expectedCash)}</span></div>
         <div class="row"><span>Haqiqiy naqd</span><span>${formatPrice(data.actualCash)}</span></div>
         <div class="row bold"><span>Farq</span><span>${formatPrice(data.variance ?? 0)}</span></div>
         ${data.note ? `<div class="note">Izoh: ${escapeHtml(data.note)}</div>` : ""}`
      : `<div class="line"></div>
         <div class="row"><span>Kutilgan naqd</span><span>${formatPrice(data.expectedCash)}</span></div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Z-hisobot</title><style>${RECEIPT_CSS}</style></head><body>
    <div class="center bold lg">${escapeHtml(data.cafeName)}</div>
    <div class="center bold">Z-HISOBOT (KUN YOPISH)</div>
    <div class="center muted">${escapeHtml(data.date)}</div>
    <div class="center muted">${formatTime()}</div>
    ${data.cashierName ? `<div class="center muted">${escapeHtml(data.cashierName)}</div>` : ""}
    <div class="line"></div>
    <div class="row"><span>Buyurtmalar</span><span class="bold">${data.orderCount}</span></div>
    <div class="row"><span>Savdo</span><span class="bold">${formatPrice(data.totalRevenue)}</span></div>
    <div class="row"><span>Chegirma</span><span>${formatPrice(data.totalDiscount)}</span></div>
    <div class="row"><span>O'rtacha chek</span><span>${formatPrice(data.avgCheck)}</span></div>
    <div class="line"></div>
    <div class="bold">TO'LOV</div>
    ${payRows || '<div class="muted">—</div>'}
    ${
      sourceRows
        ? `<div class="line"></div><div class="bold">KANAL</div>${sourceRows}`
        : ""
    }
    ${varianceBlock}
    <div class="line"></div>
    <div class="center bold">KUN YOPILDI</div>
    <div class="center muted">Nookline</div>
  </body></html>`;
}

export function printZReportReceipt(data: ZReportReceiptData) {
  return printReceiptHtml(buildZReportReceiptHtml(data));
}

const KEY_KITCHEN = "kafe_auto_print_kitchen";
const KEY_CASHIER = "kafe_auto_print_cashier";

export function getAutoPrintKitchen() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY_KITCHEN) !== "false";
}

export function getAutoPrintCashier() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(KEY_CASHIER) !== "false";
}

export function setAutoPrintKitchen(on: boolean) {
  localStorage.setItem(KEY_KITCHEN, on ? "true" : "false");
}

export function setAutoPrintCashier(on: boolean) {
  localStorage.setItem(KEY_CASHIER, on ? "true" : "false");
}

/** Kassada oshxona chekini chop etish (online). Offline'da har doim oshxona stansiyasiga qoldiriladi. */
export function shouldPrintKitchenOnCashier(online: boolean) {
  return online && getAutoPrintKitchen();
}

const KEY_PRINTED = "kafe_kitchen_printed_ids";

export function getKitchenPrintedIds(cafeId: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(`${KEY_PRINTED}:${cafeId}`);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveKitchenPrintedIds(cafeId: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  const arr = [...ids].slice(-500);
  localStorage.setItem(`${KEY_PRINTED}:${cafeId}`, JSON.stringify(arr));
}

export function markKitchenPrinted(cafeId: string, orderId: string) {
  const ids = getKitchenPrintedIds(cafeId);
  ids.add(orderId);
  saveKitchenPrintedIds(cafeId, ids);
  return ids;
}

/** Stansiya bo'yicha chop kaliti: orderId:stationId */
export function kitchenPrintKey(orderId: string, stationId?: string | null) {
  return stationId ? `${orderId}:${stationId}` : orderId;
}

export type KitchenReceiptItemInput = {
  quantity: number;
  name: string;
  prepStationId?: string | null;
  prepStationName?: string | null;
  isNewAddition?: boolean;
};

/** Buyurtmani stansiyalar bo'yicha alohida cheklarga bo'lish */
export function splitKitchenReceiptsByStation(
  base: Omit<KitchenReceiptData, "items" | "stationName">,
  items: KitchenReceiptItemInput[],
  newItemsOnly = false,
): KitchenReceiptData[] {
  const filtered = newItemsOnly ? items.filter((i) => i.isNewAddition) : items;
  if (filtered.length === 0) return [];

  const groups = new Map<string, { stationName: string; items: { quantity: number; name: string }[] }>();

  for (const item of filtered) {
    const key = item.prepStationId ?? "__default__";
    const stationName = item.prepStationName?.trim() || "Oshxona";
    const group = groups.get(key) ?? { stationName, items: [] };
    group.items.push({ quantity: item.quantity, name: item.name });
    groups.set(key, group);
  }

  return [...groups.values()].map((g) => ({
    ...base,
    stationName: g.stationName,
    items: g.items,
  }));
}
