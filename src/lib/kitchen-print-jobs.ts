import { prisma } from "@/lib/prisma";
import { publishCafeEvent } from "@/lib/realtime";
import type { KitchenReceiptData } from "@/lib/receipt-print";

export type KitchenPrintPayload = KitchenReceiptData & {
  itemIds: string[];
  printerHost?: string | null;
};

function receiptFromOrder(input: {
  cafeName: string;
  orderNumber: number;
  tableNumber?: number | null;
  stationName?: string | null;
  notes?: string | null;
  createdAt: Date;
  items: { id: string; quantity: number; name: string }[];
}): KitchenPrintPayload {
  return {
    cafeName: input.cafeName,
    orderNumber: input.orderNumber,
    tableNumber: input.tableNumber ?? undefined,
    stationName: input.stationName ?? undefined,
    notes: input.notes,
    createdAt: input.createdAt.toISOString(),
    items: input.items.map((i) => ({ quantity: i.quantity, name: i.name })),
    itemIds: input.items.map((i) => i.id),
  };
}

/**
 * CONFIRMED pozitsiyalar bo'yicha stansiya cheklarini navbatga qo'yadi.
 * itemIds berilsa — faqat shu yangi qatorlar (qo'shimcha taom).
 */
export async function enqueueKitchenPrintJobs(
  orderId: string,
  options?: { itemIds?: string[] },
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      cafe: { select: { id: true, name: true } },
      table: { select: { number: true } },
      items: {
        include: { product: { select: { name: true } }, prepStation: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!order) return { created: 0 };

  let items = order.items.filter((i) => i.status === "CONFIRMED");
  if (options?.itemIds?.length) {
    const allow = new Set(options.itemIds);
    items = items.filter((i) => allow.has(i.id));
  }
  if (items.length === 0) return { created: 0 };

  const groups = new Map<
    string,
    {
      prepStationId: string | null;
      stationName: string;
      printerHost: string | null;
      items: { id: string; quantity: number; name: string }[];
    }
  >();

  for (const item of items) {
    const key = item.prepStationId ?? "__default__";
    const stationName =
      item.prepStationName?.trim() ||
      item.prepStation?.name?.trim() ||
      "Oshxona";
    const group = groups.get(key) ?? {
      prepStationId: item.prepStationId,
      stationName,
      printerHost: item.prepStation?.printerHost ?? null,
      items: [],
    };
    const name = item.modifierSummary
      ? `${item.product.name} (${item.modifierSummary})`
      : item.product.name;
    group.items.push({ id: item.id, quantity: item.quantity, name });
    groups.set(key, group);
  }

  let created = 0;
  for (const group of groups.values()) {
    const payload = receiptFromOrder({
      cafeName: order.cafe.name,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number,
      stationName: group.stationName,
      notes: order.notes,
      createdAt: order.createdAt,
      items: group.items,
    });
    payload.printerHost = group.printerHost;

    await prisma.kitchenPrintJob.create({
      data: {
        cafeId: order.cafeId,
        orderId: order.id,
        prepStationId: group.prepStationId,
        status: "PENDING",
        payloadJson: JSON.stringify(payload),
      },
    });
    created += 1;
  }

  if (created > 0) {
    publishCafeEvent(order.cafeId, {
      type: "print.jobs",
      payload: { orderId: order.id, created },
    });
  }

  return { created };
}

/** ESC/POS matn (agent uchun) */
export function buildEscPosFromPayload(payload: KitchenPrintPayload): Buffer {
  const enc = new TextEncoder();
  const lines: string[] = [];
  const num = String(payload.orderNumber).padStart(3, "0");
  lines.push(payload.stationName?.toUpperCase() || "OSHXONA");
  lines.push(payload.cafeName);
  lines.push(`#${num}`);
  lines.push(
    payload.tableNumber != null
      ? `Stol ${payload.tableNumber}`
      : "Olib ketish / Yetkazish",
  );
  lines.push("------------------------");
  for (const item of payload.items) {
    lines.push(`${item.quantity}x  ${item.name}`);
  }
  if (payload.notes?.trim()) {
    lines.push("------------------------");
    lines.push(`IZOH: ${payload.notes.trim()}`);
  }
  lines.push("------------------------");
  lines.push(new Date(payload.createdAt || Date.now()).toLocaleString("uz-UZ"));
  lines.push("");
  lines.push("");

  const init = Uint8Array.from([0x1b, 0x40]);
  const center = Uint8Array.from([0x1b, 0x61, 0x01]);
  const left = Uint8Array.from([0x1b, 0x61, 0x00]);
  const cut = Uint8Array.from([0x1d, 0x56, 0x00]);
  const body = enc.encode(lines.join("\n") + "\n");

  return Buffer.concat([
    Buffer.from(init),
    Buffer.from(center),
    Buffer.from(enc.encode(`${payload.stationName?.toUpperCase() || "OSHXONA"}\n#${num}\n`)),
    Buffer.from(left),
    Buffer.from(body),
    Buffer.from(cut),
  ]);
}
