"use client";

/** Capacitor Native Biometric (APK) — plugin staff-app ichida */

type NativeBioAvailability = {
  isAvailable: boolean;
  biometryType?: number;
};

type NativeBioPlugin = {
  isAvailable: (opts?: {
    useFallback?: boolean;
  }) => Promise<NativeBioAvailability>;
  verifyIdentity: (opts: {
    reason?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    negativeButtonText?: string;
    maxAttempts?: number;
    useFallback?: boolean;
  }) => Promise<void>;
  setCredentials: (opts: {
    username: string;
    password: string;
    server: string;
  }) => Promise<void>;
  getCredentials: (opts: {
    server: string;
  }) => Promise<{ username: string; password: string }>;
  deleteCredentials: (opts: { server: string }) => Promise<void>;
};

function capacitor(): {
  isNativePlatform?: () => boolean;
  Plugins?: Record<string, NativeBioPlugin | undefined>;
} | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { Capacitor?: ReturnType<typeof capacitor> })
      .Capacitor ?? null
  );
}

export function isCapacitorNativeApp(): boolean {
  try {
    return Boolean(capacitor()?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function getNativeBiometricPlugin(): NativeBioPlugin | null {
  const cap = capacitor();
  if (!cap?.isNativePlatform?.()) return null;
  const plugin =
    cap.Plugins?.NativeBiometric ??
    (cap.Plugins as Record<string, NativeBioPlugin | undefined> | undefined)
      ?.CapacitorNativeBiometric;
  return plugin ?? null;
}

export function nativeBioServerKey(cafeId: string, userId: string) {
  return `nookline-staff-bio:${cafeId}:${userId}`;
}

export async function isNativeBiometricHardwareAvailable(): Promise<boolean> {
  const plugin = getNativeBiometricPlugin();
  if (!plugin) return false;
  try {
    const result = await plugin.isAvailable({ useFallback: false });
    return Boolean(result?.isAvailable);
  } catch {
    return false;
  }
}

export function createNativeBioSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
