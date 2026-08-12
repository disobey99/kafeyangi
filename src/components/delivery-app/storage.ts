import type {
  DeliveryAppTab,
  DeliveryOrderType,
  DeliveryProfile,
  SavedDeliveryOrder,
} from "./types";

const addressKey = (slug: string) => `delivery-app-address:${slug}`;
const orderTypeKey = (slug: string) => `delivery-app-order-type:${slug}`;
const promoKey = (slug: string, promoId: string) =>
  `delivery-app-promo-dismissed:${slug}:${promoId}`;
const ordersKey = (slug: string) => `delivery-app-orders:${slug}`;
const profileKey = (slug: string) => `delivery-app-profile:${slug}`;
const profileCafeKey = (cafeId: string) => `delivery-app-profile:cafe:${cafeId}`;

function isValidProfile(parsed: unknown): parsed is DeliveryProfile {
  if (!parsed || typeof parsed !== "object") return false;
  const p = parsed as DeliveryProfile;
  return (
    typeof p.name === "string" &&
    typeof p.phone === "string" &&
    p.name.trim().length > 0 &&
    p.phone.replace(/\D/g, "").length >= 9
  );
}

function normalizeProfile(parsed: DeliveryProfile): DeliveryProfile {
  return {
    name: parsed.name.trim(),
    phone: parsed.phone.trim(),
    address: typeof parsed.address === "string" ? parsed.address.trim() : "",
    email: typeof parsed.email === "string" ? parsed.email.trim() : undefined,
    lat: typeof parsed.lat === "number" ? parsed.lat : null,
    lng: typeof parsed.lng === "number" ? parsed.lng : null,
  };
}

export function readDeliveryProfile(
  slug: string,
  cafeId?: string,
): DeliveryProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const keys = [
      cafeId ? profileCafeKey(cafeId) : null,
      profileKey(slug),
    ].filter(Boolean) as string[];

    for (const key of keys) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as DeliveryProfile;
      if (isValidProfile(parsed)) {
        const next = normalizeProfile(parsed);
        // Sync both keys when found
        if (cafeId) {
          localStorage.setItem(profileCafeKey(cafeId), JSON.stringify(next));
        }
        localStorage.setItem(profileKey(slug), JSON.stringify(next));
        return next;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function writeDeliveryProfile(
  slug: string,
  profile: DeliveryProfile,
  cafeId?: string,
) {
  const next = normalizeProfile(profile);
  localStorage.setItem(profileKey(slug), JSON.stringify(next));
  if (cafeId) {
    localStorage.setItem(profileCafeKey(cafeId), JSON.stringify(next));
  }
  localStorage.setItem(addressKey(slug), next.address);
}

export function clearDeliveryProfile(slug: string, cafeId?: string) {
  localStorage.removeItem(profileKey(slug));
  if (cafeId) {
    localStorage.removeItem(profileCafeKey(cafeId));
  }
}

export function readDeliveryAddress(slug: string, cafeId?: string): string {
  if (typeof window === "undefined") return "";
  const profile = readDeliveryProfile(slug, cafeId);
  if (profile) return profile.address;
  return localStorage.getItem(addressKey(slug)) ?? "";
}

export function writeDeliveryAddress(slug: string, address: string, cafeId?: string) {
  localStorage.setItem(addressKey(slug), address);
  const profile = readDeliveryProfile(slug, cafeId);
  if (profile) {
    writeDeliveryProfile(slug, { ...profile, address }, cafeId);
  }
}

const addressesListKey = (slug: string) => `delivery-app-addresses:${slug}`;

export function readSavedAddresses(slug: string, cafeId?: string): string[] {
  if (typeof window === "undefined") return [];
  const fromProfile = readDeliveryProfile(slug, cafeId)?.address?.trim() ?? "";
  let stored: string[] = [];
  try {
    const raw = localStorage.getItem(addressesListKey(slug));
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        stored = parsed
          .filter((a): a is string => typeof a === "string")
          .map((a) => a.trim())
          .filter(Boolean);
      }
    }
  } catch {
    stored = [];
  }
  const merged = fromProfile
    ? [fromProfile, ...stored.filter((a) => a !== fromProfile)]
    : stored;
  return [...new Set(merged)].slice(0, 20);
}

export function writeSavedAddresses(slug: string, list: string[]) {
  const next = [...new Set(list.map((a) => a.trim()).filter(Boolean))].slice(0, 20);
  localStorage.setItem(addressesListKey(slug), JSON.stringify(next));
}

/** Tanlangan manzilni saqlaydi va ro'yxatga qo'shadi */
export function selectDeliveryAddress(
  slug: string,
  address: string,
  cafeId?: string,
) {
  const clean = address.trim();
  if (!clean) return readSavedAddresses(slug, cafeId);
  const list = readSavedAddresses(slug, cafeId);
  const next = [clean, ...list.filter((a) => a !== clean)].slice(0, 20);
  writeSavedAddresses(slug, next);
  writeDeliveryAddress(slug, clean, cafeId);
  return next;
}

/** Saqlangan manzilni o'chiradi. Tanlangan bo'lsa — keyingisini yoki bo'shni qo'yadi. */
export function removeSavedAddress(
  slug: string,
  address: string,
  cafeId?: string,
): { list: string[]; selected: string } {
  const clean = address.trim();
  if (!clean) {
    return {
      list: readSavedAddresses(slug, cafeId),
      selected: readDeliveryAddress(slug, cafeId),
    };
  }

  const before = readSavedAddresses(slug, cafeId);
  const nextList = before.filter((a) => a !== clean);
  writeSavedAddresses(slug, nextList);

  const current = readDeliveryAddress(slug, cafeId).trim();
  let selected = current;
  if (current === clean) {
    selected = nextList[0] ?? "";
    const profile = readDeliveryProfile(slug, cafeId);
    if (profile) {
      writeDeliveryProfile(
        slug,
        { ...profile, address: selected, lat: null, lng: null },
        cafeId,
      );
    } else {
      localStorage.setItem(addressKey(slug), selected);
    }
  }

  return {
    list: readSavedAddresses(slug, cafeId),
    selected: readDeliveryAddress(slug, cafeId),
  };
}

export function readDeliveryOrderType(
  slug: string,
  deliveryEnabled: boolean,
): DeliveryOrderType {
  if (typeof window === "undefined") {
    return deliveryEnabled ? "DELIVERY" : "TAKEAWAY";
  }
  const raw = localStorage.getItem(orderTypeKey(slug));
  if (raw === "DELIVERY" && deliveryEnabled) return "DELIVERY";
  if (raw === "TAKEAWAY") return "TAKEAWAY";
  return deliveryEnabled ? "DELIVERY" : "TAKEAWAY";
}

export function writeDeliveryOrderType(slug: string, type: DeliveryOrderType) {
  localStorage.setItem(orderTypeKey(slug), type);
}

export function isPromoDismissed(slug: string, promoId: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(promoKey(slug, promoId)) === "1";
}

export function dismissPromo(slug: string, promoId: string) {
  localStorage.setItem(promoKey(slug, promoId), "1");
}

export function readSavedOrders(slug: string): SavedDeliveryOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ordersKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedDeliveryOrder[];
    return Array.isArray(parsed) ? parsed.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function pushSavedOrder(slug: string, order: SavedDeliveryOrder) {
  const prev = readSavedOrders(slug).filter((o) => o.id !== order.id);
  localStorage.setItem(
    ordersKey(slug),
    JSON.stringify([order, ...prev].slice(0, 20)),
  );
}

const favoritesKey = (slug: string) => `delivery-app-favorites:${slug}`;

export function readFavorites(slug: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(favoritesKey(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(slug: string, productId: string): string[] {
  const list = readFavorites(slug);
  const exists = list.includes(productId);
  const next = exists ? list.filter((id) => id !== productId) : [...list, productId];
  localStorage.setItem(favoritesKey(slug), JSON.stringify(next));
  return next;
}

const tabKey = (slug: string) => `delivery-app-tab:${slug}`;

const VALID_TABS = new Set(["home", "menu", "cart", "orders", "profile"]);

export function readDeliveryTab(slug: string): DeliveryAppTab | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(tabKey(slug));
    if (raw && VALID_TABS.has(raw)) return raw as DeliveryAppTab;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeDeliveryTab(slug: string, tab: DeliveryAppTab) {
  try {
    localStorage.setItem(tabKey(slug), tab);
  } catch {
    /* ignore */
  }
}

