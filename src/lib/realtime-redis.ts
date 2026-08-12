import "server-only";

import type { CafeEvent, PlatformEvent } from "@/lib/realtime";

const CAFE_CHANNEL = (cafeId: string) => `nookline:cafe:${cafeId}`;
const PLATFORM_CHANNEL = "nookline:platform";

type RedisClient = import("ioredis").default;

const g = globalThis as unknown as {
  __nookRedisPub?: RedisClient | null;
  __nookRedisSub?: RedisClient | null;
  __nookRedisInit?: Promise<boolean> | null;
  __nookRedisCafeRefs?: Map<string, number>;
  __nookRedisPlatformRefs?: number;
  __nookRedisCafeHandlers?: Map<string, Set<(event: CafeEvent) => void>>;
  __nookRedisPlatformHandlers?: Set<(event: PlatformEvent) => void>;
};

function redisUrl(): string | null {
  const url =
    process.env.REDIS_URL?.trim() ||
    process.env.UPSTASH_REDIS_URL?.trim() ||
    "";
  return url || null;
}

async function ensureRedis(): Promise<{
  pub: RedisClient;
  sub: RedisClient;
} | null> {
  const url = redisUrl();
  if (!url) return null;

  if (g.__nookRedisPub && g.__nookRedisSub) {
    return { pub: g.__nookRedisPub, sub: g.__nookRedisSub };
  }

  if (!g.__nookRedisInit) {
    g.__nookRedisInit = (async () => {
      const Redis = (await import("ioredis")).default;
      const pub = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
      const sub = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
      });
      await Promise.all([pub.connect(), sub.connect()]);

      g.__nookRedisCafeHandlers = new Map();
      g.__nookRedisPlatformHandlers = new Set();
      g.__nookRedisCafeRefs = new Map();
      g.__nookRedisPlatformRefs = 0;

      sub.on("message", (channel, message) => {
        try {
          if (channel === PLATFORM_CHANNEL) {
            const event = JSON.parse(message) as PlatformEvent;
            g.__nookRedisPlatformHandlers?.forEach((h) => h(event));
            return;
          }
          if (!channel.startsWith("nookline:cafe:")) return;
          const cafeId = channel.slice("nookline:cafe:".length);
          const event = JSON.parse(message) as CafeEvent;
          g.__nookRedisCafeHandlers?.get(cafeId)?.forEach((h) => h(event));
        } catch {
          /* ignore */
        }
      });

      g.__nookRedisPub = pub;
      g.__nookRedisSub = sub;
      return true;
    })().catch((err) => {
      g.__nookRedisInit = null;
      console.error("redis realtime init failed:", err);
      return false;
    });
  }

  const ok = await g.__nookRedisInit;
  if (!ok || !g.__nookRedisPub || !g.__nookRedisSub) return null;
  return { pub: g.__nookRedisPub, sub: g.__nookRedisSub };
}

export async function redisPublishCafe(cafeId: string, event: CafeEvent) {
  const redis = await ensureRedis();
  if (!redis) return;
  await redis.pub.publish(CAFE_CHANNEL(cafeId), JSON.stringify(event));
}

export async function redisPublishPlatform(event: PlatformEvent) {
  const redis = await ensureRedis();
  if (!redis) return;
  await redis.pub.publish(PLATFORM_CHANNEL, JSON.stringify(event));
}

export async function redisSubscribeCafe(
  cafeId: string,
  listener: (event: CafeEvent) => void,
): Promise<() => void> {
  const redis = await ensureRedis();
  if (!redis) return () => undefined;

  if (!g.__nookRedisCafeHandlers!.has(cafeId)) {
    g.__nookRedisCafeHandlers!.set(cafeId, new Set());
  }
  g.__nookRedisCafeHandlers!.get(cafeId)!.add(listener);

  const refs = g.__nookRedisCafeRefs!;
  const prev = refs.get(cafeId) ?? 0;
  refs.set(cafeId, prev + 1);
  if (prev === 0) {
    await redis.sub.subscribe(CAFE_CHANNEL(cafeId));
  }

  return () => {
    g.__nookRedisCafeHandlers?.get(cafeId)?.delete(listener);
    const n = (refs.get(cafeId) ?? 1) - 1;
    if (n <= 0) {
      refs.delete(cafeId);
      void redis.sub.unsubscribe(CAFE_CHANNEL(cafeId)).catch(() => undefined);
    } else {
      refs.set(cafeId, n);
    }
  };
}

export async function redisSubscribePlatform(
  listener: (event: PlatformEvent) => void,
): Promise<() => void> {
  const redis = await ensureRedis();
  if (!redis) return () => undefined;

  g.__nookRedisPlatformHandlers!.add(listener);
  const prev = g.__nookRedisPlatformRefs ?? 0;
  g.__nookRedisPlatformRefs = prev + 1;
  if (prev === 0) {
    await redis.sub.subscribe(PLATFORM_CHANNEL);
  }

  return () => {
    g.__nookRedisPlatformHandlers?.delete(listener);
    const n = (g.__nookRedisPlatformRefs ?? 1) - 1;
    g.__nookRedisPlatformRefs = Math.max(0, n);
    if (n <= 0) {
      void redis.sub.unsubscribe(PLATFORM_CHANNEL).catch(() => undefined);
    }
  };
}
