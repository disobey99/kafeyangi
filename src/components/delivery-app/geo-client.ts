export type GeoErrorCode =
  | "unsupported"
  | "insecure"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unknown";

export class BrowserGeoError extends Error {
  code: GeoErrorCode;
  constructor(code: GeoErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

export function isGeoSecureContext(): boolean {
  if (typeof window === "undefined") return false;
  return window.isSecureContext === true;
}

export function getBrowserPosition(
  options?: PositionOptions,
): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new BrowserGeoError("unsupported", "GPS qo'llab-quvvatlanmaydi"));
      return;
    }
    if (!isGeoSecureContext()) {
      reject(
        new BrowserGeoError(
          "insecure",
          "Joylashuv faqat HTTPS (xavfsiz) saytda ishlaydi. IP manzil (http://192...) emas, https://...trycloudflare.com linkidan oching.",
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new BrowserGeoError(
              "denied",
              "Joylashuv ruxsati yo'q — brauzer yoki Chrome ilovasi bloklagan",
            ),
          );
          return;
        }
        if (err.code === err.POSITION_UNAVAILABLE) {
          reject(
            new BrowserGeoError(
              "unavailable",
              "Joylashuv olinmadi — GPS signalini tekshiring",
            ),
          );
          return;
        }
        if (err.code === err.TIMEOUT) {
          reject(
            new BrowserGeoError("timeout", "Joylashuv kutish muddati tugadi"),
          );
          return;
        }
        reject(
          new BrowserGeoError("unknown", err.message || "Joylashuv olinmadi"),
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30_000,
        ...options,
      },
    );
  });
}

export function watchBrowserPosition(
  onPos: (lat: number, lng: number) => void,
  onError?: (message: string, code?: GeoErrorCode) => void,
): () => void {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    onError?.("GPS qo'llab-quvvatlanmaydi", "unsupported");
    return () => undefined;
  }
  if (!isGeoSecureContext()) {
    onError?.(
      "HTTPS kerak — http://IP emas, xavfsiz linkdan oching",
      "insecure",
    );
    return () => undefined;
  }
  const id = navigator.geolocation.watchPosition(
    (pos) => onPos(pos.coords.latitude, pos.coords.longitude),
    (err) => {
      const code: GeoErrorCode =
        err.code === err.PERMISSION_DENIED
          ? "denied"
          : err.code === err.TIMEOUT
            ? "timeout"
            : err.code === err.POSITION_UNAVAILABLE
              ? "unavailable"
              : "unknown";
      onError?.(err.message || "GPS xato", code);
    },
    { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
