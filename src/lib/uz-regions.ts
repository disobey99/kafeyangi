/** O'zbekiston asosiy shahar/viloyat markazlari (xarita uchun) */
export const UZ_REGIONS: { name: string; lat: number; lng: number }[] = [
  { name: "Toshkent", lat: 41.2995, lng: 69.2401 },
  { name: "Toshkent viloyati", lat: 41.2213, lng: 69.8597 },
  { name: "Samarqand", lat: 39.6542, lng: 66.9597 },
  { name: "Buxoro", lat: 39.7681, lng: 64.4556 },
  { name: "Andijon", lat: 40.7821, lng: 72.3442 },
  { name: "Farg'ona", lat: 40.3864, lng: 71.7864 },
  { name: "Namangan", lat: 40.9983, lng: 71.6726 },
  { name: "Xorazm", lat: 41.55, lng: 60.6333 },
  { name: "Navoiy", lat: 40.0844, lng: 65.3792 },
  { name: "Qashqadaryo", lat: 38.8606, lng: 65.7891 },
  { name: "Surxondaryo", lat: 37.9409, lng: 67.5709 },
  { name: "Jizzax", lat: 40.1158, lng: 67.8422 },
  { name: "Sirdaryo", lat: 40.5, lng: 68.7833 },
  { name: "Qoraqalpog'iston", lat: 43.7683, lng: 59.0214 },
];

export function coordsForRegion(region: string | null | undefined) {
  if (!region?.trim()) return null;
  const hit = UZ_REGIONS.find(
    (r) => r.name.toLowerCase() === region.trim().toLowerCase(),
  );
  return hit ? { lat: hit.lat, lng: hit.lng } : null;
}
