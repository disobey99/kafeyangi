/** Shared cafe site business hours helpers */
export type CafeBusinessHours = {
  monFri: string;
  sat: string;
  sun: string;
};

export const DEFAULT_BUSINESS_HOURS: CafeBusinessHours = {
  monFri: "08:00 – 22:00",
  sat: "09:00 – 23:00",
  sun: "09:00 – 21:00",
};

export function parseBusinessHours(
  raw: string | null | undefined,
): CafeBusinessHours {
  if (!raw) return { ...DEFAULT_BUSINESS_HOURS };
  try {
    const parsed = JSON.parse(raw) as Partial<CafeBusinessHours>;
    return {
      monFri: parsed.monFri?.trim() || DEFAULT_BUSINESS_HOURS.monFri,
      sat: parsed.sat?.trim() || DEFAULT_BUSINESS_HOURS.sat,
      sun: parsed.sun?.trim() || DEFAULT_BUSINESS_HOURS.sun,
    };
  } catch {
    return { ...DEFAULT_BUSINESS_HOURS };
  }
}
