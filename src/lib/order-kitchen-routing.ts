import { OrderSource } from "@prisma/client";

/** Ofitsiant / stol QR — kassir tasdiqsiz to'g'ridan-to'g'ri oshxonaga */
export function shouldAutoSendToKitchen(
  source: OrderSource | string,
): boolean {
  return source === OrderSource.WAITER || source === OrderSource.QR_TABLE;
}
