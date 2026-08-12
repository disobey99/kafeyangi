"use client";

export type ClientGeoResult =
  | { ok: true; latitude: number; longitude: number }
  | { ok: false; reason: "unsupported" | "denied" | "timeout" | "error" };

export function getClientLocation(timeoutMs = 12000): Promise<ClientGeoResult> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, reason: "unsupported" });
      return;
    }

    const timer = window.setTimeout(() => {
      resolve({ ok: false, reason: "timeout" });
    }, timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timer);
        resolve({
          ok: true,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        window.clearTimeout(timer);
        if (err.code === err.PERMISSION_DENIED) {
          resolve({ ok: false, reason: "denied" });
          return;
        }
        resolve({ ok: false, reason: "error" });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export async function reverseGeocodeClient(latitude: number, longitude: number) {
  const res = await fetch("/api/geocode/reverse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude, longitude }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    location?: {
      address: string;
      region: string | null;
      latitude: number;
      longitude: number;
    };
    error?: string;
  };
  if (!res.ok || !data.location) {
    throw new Error(data.error ?? "Manzil topilmadi");
  }
  return data.location;
}

export async function forwardGeocodeClient(
  address: string,
  near?: { latitude?: number | null; longitude?: number | null },
) {
  const res = await fetch("/api/geocode/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address,
      nearLat: near?.latitude ?? null,
      nearLng: near?.longitude ?? null,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    location?: {
      address: string;
      region: string | null;
      latitude: number;
      longitude: number;
      query?: string;
    };
    error?: string;
  };
  if (!res.ok || !data.location) {
    throw new Error(data.error ?? "Manzil topilmadi");
  }
  return data.location;
}
