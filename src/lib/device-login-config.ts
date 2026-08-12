/**
 * Ikkinchi qurilmadan kirish tasdig'i.
 * O'chirish: `.env` da `DEVICE_LOGIN_APPROVAL=false` yoki o'chiring.
 *
 * Vercel + SQLite da TrustedDevice saqlanmaydi (ephemeral FS) —
 * yoqib qo'yilsa login → darhol logout loop bo'ladi.
 */
export function isDeviceLoginApprovalEnabled() {
  if (process.env.DEVICE_LOGIN_APPROVAL !== "true") return false;
  const db = process.env.DATABASE_URL ?? "";
  if (process.env.VERCEL && db.startsWith("file:")) return false;
  return true;
}
