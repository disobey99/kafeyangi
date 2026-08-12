/** SQLite / Prisma raw dan kelgan sanalarni xavfsiz Date ga aylantirish */

export function parseDbDate(
  value: string | number | bigint | Date | null | undefined,
): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "bigint") {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    const d = new Date(n < 1e12 ? n * 1000 : n);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const d = new Date(value < 1e12 ? value * 1000 : value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = String(value).trim();
  if (!s) return null;

  // Millisekund / sekund timestamp (string)
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const d = new Date(s.length <= 10 ? n * 1000 : n);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toIsoDate(
  value: string | number | bigint | Date | null | undefined,
): string | null {
  const d = parseDbDate(value);
  return d ? d.toISOString() : null;
}
