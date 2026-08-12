export type CafeEvent = {
  type:
    | "order.created"
    | "order.updated"
    | "table.updated"
    | "waiter.called"
    | "waiter.acknowledged"
    | "staff.pin.reset"
    | "walkie.talkie"
    | "walkie.ptt"
    | "login.approval"
    | "ops.chat.created"
    | "ops.chat.read"
    | "ops.chat.typing"
    | "ops.chat.presence"
    | "ops.notice.created"
    | "ops.notice.updated"
    | "ops.shift_swap.updated"
    | "ops.iot.alarm"
    | "support.message"
    | "print.jobs";
  payload?: unknown;
};

export type PlatformEvent = {
  type: "support.message";
  payload?: { cafeId?: string };
};

type Listener = (event: CafeEvent) => void;
type PlatformListener = (event: PlatformEvent) => void;

const globalForRealtime = globalThis as unknown as {
  cafeListeners?: Map<string, Set<Listener>>;
  platformListeners?: Set<PlatformListener>;
};

function getChannels() {
  if (!globalForRealtime.cafeListeners) {
    globalForRealtime.cafeListeners = new Map();
  }
  return globalForRealtime.cafeListeners;
}

function getPlatformListeners() {
  if (!globalForRealtime.platformListeners) {
    globalForRealtime.platformListeners = new Set();
  }
  return globalForRealtime.platformListeners;
}

function isServerRuntime() {
  return typeof window === "undefined";
}

/** Redis faqat serverda — client bundle ga ioredis kirmasin */
function redisModule() {
  if (!isServerRuntime()) return null;
  // webpack/turbopack: server-only fayl
  return import("@/lib/realtime-redis");
}

export function subscribeCafe(cafeId: string, listener: Listener) {
  const channels = getChannels();
  if (!channels.has(cafeId)) {
    channels.set(cafeId, new Set());
  }
  channels.get(cafeId)!.add(listener);

  let redisUnsub: (() => void) | undefined;
  void redisModule()
    ?.then(async (m) => {
      redisUnsub = await m.redisSubscribeCafe(cafeId, listener);
    })
    .catch(() => {
      /* Redis yo‘q — faqat memory */
    });

  return () => {
    channels.get(cafeId)?.delete(listener);
    redisUnsub?.();
  };
}

export function publishCafeEvent(cafeId: string, event: CafeEvent) {
  const hasRedisEnv = Boolean(
    process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_URL?.trim(),
  );

  if (hasRedisEnv && isServerRuntime()) {
    void redisModule()
      ?.then((m) => m.redisPublishCafe(cafeId, event))
      .catch((err) => {
        console.error("redis publish cafe failed:", err);
        getChannels().get(cafeId)?.forEach((listener) => listener(event));
      });
    return;
  }

  getChannels().get(cafeId)?.forEach((listener) => listener(event));
}

export function subscribePlatform(listener: PlatformListener) {
  const listeners = getPlatformListeners();
  listeners.add(listener);

  let redisUnsub: (() => void) | undefined;
  void redisModule()
    ?.then(async (m) => {
      redisUnsub = await m.redisSubscribePlatform(listener);
    })
    .catch(() => {
      /* local */
    });

  return () => {
    listeners.delete(listener);
    redisUnsub?.();
  };
}

export function publishPlatformEvent(event: PlatformEvent) {
  const hasRedisEnv = Boolean(
    process.env.REDIS_URL?.trim() || process.env.UPSTASH_REDIS_URL?.trim(),
  );

  if (hasRedisEnv && isServerRuntime()) {
    void redisModule()
      ?.then((m) => m.redisPublishPlatform(event))
      .catch((err) => {
        console.error("redis publish platform failed:", err);
        getPlatformListeners().forEach((listener) => listener(event));
      });
    return;
  }

  getPlatformListeners().forEach((listener) => listener(event));
}
