export const TABLE_ZONES = ["HALL", "BOOTH", "OUTDOOR"] as const;

export type TableZone = string;

export const TABLE_ZONE_LABELS: Record<string, string> = {
  HALL: "Umumiy zal",
  BOOTH: "Kabina",
  OUTDOOR: "Tashqari",
};

export const TABLE_ZONE_ORDER: string[] = ["HALL", "BOOTH", "OUTDOOR"];

export function isTableZone(value: string): boolean {
  return true;
}

export function tableZoneLabel(zone: string | null | undefined): string {
  if (!zone) return TABLE_ZONE_LABELS.HALL;
  return TABLE_ZONE_LABELS[zone] ?? zone;
}
