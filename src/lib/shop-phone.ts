/** Telefon solishtirish: faqat raqamlar */
export function normalizeShopPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Oxirgi 9 raqam (UZ mobil) yoki to‘liq — moslashish uchun */
export function shopPhoneVariants(phone: string): string[] {
  const digits = normalizeShopPhone(phone);
  if (digits.length < 7) return [];
  const variants = new Set<string>([digits]);
  if (digits.length >= 9) variants.add(digits.slice(-9));
  if (digits.startsWith("998") && digits.length >= 12) {
    variants.add(digits.slice(3));
  }
  return [...variants];
}
