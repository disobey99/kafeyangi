const CACHE = "kafe-v5";
const API_CACHE = "kafe-api-v2";

const OFFLINE_SHELL = ["/icons/icon.svg"];

/** Auth va xodim sahifalari — hech qachon cache-first emas */
const NO_CACHE_PREFIXES = [
  "/staff/",
  "/cashier/",
  "/kitchen/",
  "/display/",
  "/dashboard",
  "/platform",
  "/login",
  "/register",
];

function shouldSkipCache(pathname) {
  return NO_CACHE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(OFFLINE_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE && k !== API_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  if (url.pathname.startsWith("/api/orders") && url.searchParams.has("cafeId")) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (url.pathname.startsWith("/api/cafes/") && url.pathname.includes("table-bill")) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  if (url.pathname.includes("/staff/pin")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigate(request, url.pathname));
    return;
  }

  if (url.pathname.startsWith("/_next/static")) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirstNavigate(request, pathname) {
  if (shouldSkipCache(pathname)) {
    return fetch(request);
  }

  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return fetch(request);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(CACHE);
    cache.put(request, res.clone());
  }
  return res;
}

async function networkFirstApi(request) {
  const cache = await caches.open(API_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) {
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true, orders: [], tables: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

const WAITER_VIBRATE = [400, 120, 400, 120, 600, 120, 600];

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const tableNumber = data.tableNumber;
  const title =
    data.type === "waiter_call"
      ? data.title || "Ofitsiant chaqirildi!"
      : data.type === "courier_delivery"
        ? data.title || "Yetkazish"
        : data.type === "new_order"
          ? data.title || "Yangi buyurtma"
          : data.title || "Nookline";
  const body =
    data.type === "courier_delivery"
      ? data.body || "Yangi yetkazish buyurtmasi"
      : data.type === "new_order"
        ? data.body ||
          (data.orderNumber != null
            ? `#${String(data.orderNumber).padStart(3, "0")}`
            : "Yangi buyurtma")
        : tableNumber != null
          ? `Stol ${tableNumber} — tezroq boring`
          : data.body || "Yangi xabar";
  const url =
    data.url ||
    (data.type === "courier_delivery" && data.cafeId
      ? `/`
      : data.type === "new_order" && data.cafeId
        ? `/cashier/${data.cafeId}`
        : data.cafeId
          ? `/staff/${data.cafeId}`
          : "/");

  const vibrate =
    data.type === "courier_delivery"
      ? [200, 100, 200, 100, 400]
      : data.type === "new_order"
        ? [200, 80, 200, 80, 400, 80, 400]
        : WAITER_VIBRATE;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      vibrate,
      tag:
        data.type === "courier_delivery" && data.orderId
          ? `courier-${data.orderId}-${data.status || ""}`
          : data.type === "new_order" && data.orderId
            ? `order-${data.orderId}`
            : data.callId
              ? `waiter-call-${data.callId}`
              : "kafe-alert",
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || "/";
  const fullUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullUrl);
      }
    }),
  );
});
