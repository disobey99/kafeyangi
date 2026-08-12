export type FloorDisplayStatus = "FREE" | "OCCUPIED" | "READY" | "BILL_REQUESTED";

const DISPLAY_LABELS: Record<FloorDisplayStatus, string> = {
  FREE: "Bo'sh",
  OCCUPIED: "Band",
  READY: "Tayyor",
  BILL_REQUESTED: "Hisob so'ralgan",
};

type OpenOrder = {
  status: string;
  createdAt: string | Date;
  customerName?: string | null;
};

export function resolveFloorDisplayStatus(
  tableStatus: string,
  orders: { status: string }[],
): FloorDisplayStatus {
  if (tableStatus === "BILL_REQUESTED") return "BILL_REQUESTED";
  if (orders.some((o) => o.status === "READY")) return "READY";
  if (tableStatus === "OCCUPIED" || orders.length > 0) return "OCCUPIED";
  return "FREE";
}

export function floorDisplayLabel(status: FloorDisplayStatus): string {
  return DISPLAY_LABELS[status];
}

export function floorOccupiedMinutes(orders: OpenOrder[]): number | null {
  const since = floorOccupiedSince(orders);
  if (!since) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(since).getTime()) / 60_000));
}

export function floorOccupiedSince(orders: OpenOrder[]): string | null {
  if (orders.length === 0) return null;
  const oldest = orders.reduce((min, o) => {
    const t = new Date(o.createdAt).getTime();
    return t < min ? t : min;
  }, new Date(orders[0].createdAt).getTime());
  return new Date(oldest).toISOString();
}

export function resolveSessionOccupiedSince(
  displayStatus: FloorDisplayStatus,
  sessionOrders: OpenOrder[],
  openStatuses: readonly string[],
): string | null {
  if (displayStatus === "FREE" || sessionOrders.length === 0) return null;
  const open = sessionOrders.filter((o) => openStatuses.includes(o.status));
  return floorOccupiedSince(open.length > 0 ? open : sessionOrders);
}

/** Buyurtma vaqtidan hozirgacha (jonli yangilanadi) */
export function formatOccupiedDuration(since: string | Date, now = Date.now()): string {
  const ms = Math.max(0, now - new Date(since).getTime());
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Hozirgina";
  if (mins < 60) return `${mins} daqiqa`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest > 0 ? `${hours} soat ${rest} daqiqa` : `${hours} soat`;
}

export function floorGuestLabel(
  assignedWaiter: { name: string } | null | undefined,
  orders: OpenOrder[],
): string | null {
  if (assignedWaiter?.name) return assignedWaiter.name;
  for (const o of orders) {
    if (o.customerName?.trim()) return o.customerName.trim();
  }
  return null;
}
