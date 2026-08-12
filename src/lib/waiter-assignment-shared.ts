/** Client-safe helpers (prisma/realtime yo‘q) */

export const WAITER_ASSIGNMENT_TIMEOUT_MS = 3 * 60 * 1000;

export function isWaiterAssignmentOverdue(
  createdAt: Date | string,
  now = Date.now(),
): boolean {
  return now - new Date(createdAt).getTime() >= WAITER_ASSIGNMENT_TIMEOUT_MS;
}

export function formatWaiterWaitDuration(
  createdAt: Date | string,
  now = Date.now(),
): string {
  const sec = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
