const PREFIX = "kafe:table-orders:";
const VISIT_PREFIX = "kafe:table-visit:";
const READY_ACK_PREFIX = "kafe-self-ready-ack:";

export function tableOrderSessionKey(qrToken: string) {
  return `${PREFIX}${qrToken}`;
}

export function tableVisitSessionKey(qrToken: string) {
  return `${VISIT_PREFIX}${qrToken}`;
}

export function rememberTableOrder(qrToken: string, orderId: string) {
  if (typeof window === "undefined") return;
  try {
    const key = tableOrderSessionKey(qrToken);
    const raw = localStorage.getItem(key);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    if (!ids.includes(orderId)) {
      localStorage.setItem(key, JSON.stringify([orderId, ...ids].slice(0, 50)));
    }
  } catch {
    /* ignore */
  }
}

export function getRememberedTableOrders(qrToken: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(tableOrderSessionKey(qrToken));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function getStoredVisitToken(qrToken: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(tableVisitSessionKey(qrToken));
  } catch {
    return null;
  }
}

export function storeVisitToken(qrToken: string, visitToken: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(tableVisitSessionKey(qrToken), visitToken);
  } catch {
    /* ignore */
  }
}

export function clearTableGuestSession(qrToken: string) {
  if (typeof window === "undefined") return;
  try {
    const orderIds = getRememberedTableOrders(qrToken);
    localStorage.removeItem(tableOrderSessionKey(qrToken));
    sessionStorage.removeItem(tableVisitSessionKey(qrToken));
    for (const id of orderIds) {
      localStorage.removeItem(`${READY_ACK_PREFIX}${id}`);
    }
    window.dispatchEvent(new CustomEvent("kafe:guest-session-cleared"));
  } catch {
    /* ignore */
  }
}
