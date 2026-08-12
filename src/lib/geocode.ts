import { UZ_REGIONS } from "@/lib/uz-regions";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const USER_AGENT = "Nookline/1.0 (cafe registration geocoding)";

/** O‘zbekiston taxminiy chegarasi */
export const UZ_BBOX = {
  minLat: 37.0,
  maxLat: 45.7,
  minLng: 55.9,
  maxLng: 73.2,
} as const;

/** Janubiy Koreya taxminiy chegarasi */
export const KR_BBOX = {
  minLat: 33.0,
  maxLat: 38.7,
  minLng: 124.5,
  maxLng: 132.0,
} as const;

type NominatimAddress = {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    country_code?: string;
    country?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    county?: string;
    suburb?: string;
    borough?: string;
    quarter?: string;
    neighbourhood?: string;
    road?: string;
    house_number?: string;
  };
};

type SearchScope = {
  countrycodes?: string;
  querySuffix?: string;
  acceptLanguage: string;
  bbox?: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  /** Natijani shu mamlakat kodi bilan cheklash (yo‘q = istalgan) */
  requireCountry?: string;
};

function pickRegionName(
  parts: NominatimAddress["address"],
  lat: number,
  lng: number,
): string | null {
  if (!parts) {
    return isInUzbekistan(lat, lng) ? nearestUzRegion(lat, lng) : null;
  }
  const candidates = [parts.state, parts.county, parts.city, parts.town].filter(
    Boolean,
  ) as string[];

  if (isInUzbekistan(lat, lng)) {
    for (const candidate of candidates) {
      const hit = UZ_REGIONS.find(
        (r) =>
          candidate.toLowerCase().includes(r.name.toLowerCase()) ||
          r.name.toLowerCase().includes(candidate.toLowerCase()),
      );
      if (hit) return hit.name;
    }
    return candidates[0] ?? nearestUzRegion(lat, lng);
  }

  return candidates[0] ?? parts.country ?? null;
}

function formatAddress(parts: NominatimAddress["address"], fallback: string): string {
  if (!parts) return fallback;
  const street = [parts.road, parts.house_number].filter(Boolean).join(" ");
  const locality =
    parts.suburb ||
    parts.borough ||
    parts.quarter ||
    parts.neighbourhood ||
    parts.city ||
    parts.town ||
    parts.village;
  const chunks = [street, locality, parts.state, parts.country].filter(Boolean);
  return chunks.length > 0 ? chunks.join(", ") : fallback;
}

export function isInUzbekistan(lat: number, lng: number): boolean {
  return (
    lat >= UZ_BBOX.minLat &&
    lat <= UZ_BBOX.maxLat &&
    lng >= UZ_BBOX.minLng &&
    lng <= UZ_BBOX.maxLng
  );
}

export function isInSouthKorea(lat: number, lng: number): boolean {
  return (
    lat >= KR_BBOX.minLat &&
    lat <= KR_BBOX.maxLat &&
    lng >= KR_BBOX.minLng &&
    lng <= KR_BBOX.maxLng
  );
}

export function nearestUzRegion(lat: number, lng: number): string | null {
  let best: { name: string; dist: number } | null = null;
  for (const r of UZ_REGIONS) {
    const d = (r.lat - lat) ** 2 + (r.lng - lng) ** 2;
    if (!best || d < best.dist) best = { name: r.name, dist: d };
  }
  return best?.name ?? null;
}

async function nominatimFetch(path: string): Promise<NominatimAddress[]> {
  const res = await fetch(`${NOMINATIM}${path}`, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as NominatimAddress | NominatimAddress[];
  return Array.isArray(data) ? data : [data];
}

function looksKorean(text: string): boolean {
  return (
    /[\uac00-\ud7a3]/.test(text) ||
    /한국|대한민국|korea|south\s*korea|seoul|서울|부산|인천|대구|대전|광주|울산|경기도|제주|수원|성남|용인|고양|창원|청주|전주|포항|김해|화성|부천|안산|안양|남양주|평택/i.test(
      text,
    )
  );
}

function looksUzbek(text: string): boolean {
  return /o['’`]?zbekiston|uzbekistan|узбекистан|toshkent|ташкент|samarqand|самарканд|buxoro|бухар|andijon|namangan|fergana|farg['’`]?ona|xorazm|navoiy|qashqadaryo|surxondaryo|sirdaryo|jizzax|nukus|qoraqalpog/i.test(
    text,
  );
}

/**
 * Matndan qidiruv hududini aniqlaydi (Koreya / UZ / umumiy).
 * preferUz — kuryer/yetkazib berish kabi UZ-only oqimlar uchun.
 */
export function resolveSearchScope(
  text: string,
  opts?: { preferUz?: boolean; nearLat?: number | null; nearLng?: number | null },
): SearchScope {
  const trimmed = text.trim();

  if (looksKorean(trimmed)) {
    return {
      countrycodes: "kr",
      querySuffix: "South Korea",
      acceptLanguage: "ko,en",
      bbox: KR_BBOX,
      requireCountry: "kr",
    };
  }

  if (looksUzbek(trimmed) || opts?.preferUz) {
    return {
      countrycodes: "uz",
      querySuffix: "Uzbekistan",
      acceptLanguage: "uz,ru,en",
      bbox: UZ_BBOX,
      requireCountry: "uz",
    };
  }

  // GPS yaqinligi bo‘yicha
  if (
    opts?.nearLat != null &&
    opts?.nearLng != null &&
    Number.isFinite(opts.nearLat) &&
    Number.isFinite(opts.nearLng)
  ) {
    if (isInSouthKorea(opts.nearLat, opts.nearLng)) {
      return {
        countrycodes: "kr",
        querySuffix: "South Korea",
        acceptLanguage: "ko,en",
        bbox: KR_BBOX,
        requireCountry: "kr",
      };
    }
    if (isInUzbekistan(opts.nearLat, opts.nearLng)) {
      return {
        countrycodes: "uz",
        querySuffix: "Uzbekistan",
        acceptLanguage: "uz,ru,en",
        bbox: UZ_BBOX,
        requireCountry: "uz",
      };
    }
  }

  // Aniq belgi yo‘q — butun dunyo (noto‘g‘ri Buxoro majburlamasin)
  return {
    acceptLanguage: "en,uz,ru,ko",
  };
}

function isValidResult(row: NominatimAddress, scope: SearchScope): boolean {
  const lat = Number(row.lat);
  const lng = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const cc = row.address?.country_code?.toLowerCase();
  if (scope.requireCountry) {
    if (cc && cc !== scope.requireCountry) return false;
    if (scope.requireCountry === "uz" && !isInUzbekistan(lat, lng)) return false;
    if (scope.requireCountry === "kr" && !isInSouthKorea(lat, lng)) return false;
  }
  return true;
}

export async function reverseGeocode(lat: number, lng: number) {
  const lang = isInSouthKorea(lat, lng)
    ? "ko,en"
    : isInUzbekistan(lat, lng)
      ? "uz,ru,en"
      : "en,uz,ru,ko";
  const rows = await nominatimFetch(
    `/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=${encodeURIComponent(lang)}`,
  );
  const row = rows[0];
  if (!row?.display_name) return null;

  const region = pickRegionName(row.address, lat, lng);
  return {
    latitude: lat,
    longitude: lng,
    address: formatAddress(row.address, row.display_name),
    region,
  };
}

/**
 * Manzilni qidiradi. Koreya/UZ matndan avtomatik aniqlanadi.
 * preferUz — faqat O‘zbekiston (kuryer monitor).
 */
export async function geocodeAddress(
  address: string,
  opts?: {
    nearLat?: number | null;
    nearLng?: number | null;
    preferUz?: boolean;
  },
) {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const scope = resolveSearchScope(trimmed, opts);
  const hasSuffix =
    scope.querySuffix &&
    new RegExp(scope.querySuffix.replace(/\s+/g, "\\s*"), "i").test(trimmed);
  const query =
    scope.querySuffix && !hasSuffix ? `${trimmed}, ${scope.querySuffix}` : trimmed;

  const params = new URLSearchParams({
    format: "json",
    q: query,
    limit: "8",
    addressdetails: "1",
    "accept-language": scope.acceptLanguage,
  });
  if (scope.countrycodes) {
    params.set("countrycodes", scope.countrycodes);
  }

  // left,top,right,bottom (lon,lat)
  if (
    opts?.nearLat != null &&
    opts?.nearLng != null &&
    Number.isFinite(opts.nearLat) &&
    Number.isFinite(opts.nearLng)
  ) {
    const d = scope.requireCountry === "kr" ? 0.25 : 0.35;
    params.set(
      "viewbox",
      [
        opts.nearLng - d,
        opts.nearLat + d,
        opts.nearLng + d,
        opts.nearLat - d,
      ].join(","),
    );
  } else if (scope.bbox) {
    params.set(
      "viewbox",
      `${scope.bbox.minLng},${scope.bbox.maxLat},${scope.bbox.maxLng},${scope.bbox.minLat}`,
    );
  }

  const rows = await nominatimFetch(`/search?${params.toString()}`);
  const matched =
    rows.find((r) => isValidResult(r, scope)) ??
    (!scope.requireCountry ? rows[0] : undefined);

  if (!matched?.lat || !matched?.lon) return null;

  const lat = Number(matched.lat);
  const lng = Number(matched.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    latitude: lat,
    longitude: lng,
    address: trimmed,
    region: pickRegionName(matched.address, lat, lng),
    displayName: formatAddress(matched.address, matched.display_name ?? trimmed),
  };
}

/** Ro'yxatdan o'tish: GPS yoki manzildan joylashuv */
export async function resolveCafeLocation(input: {
  address?: string;
  latitude?: number;
  longitude?: number;
  region?: string;
}) {
  if (
    input.latitude != null &&
    input.longitude != null &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    const fromGps = await reverseGeocode(input.latitude, input.longitude);
    if (fromGps) {
      return {
        latitude: fromGps.latitude,
        longitude: fromGps.longitude,
        address: input.address?.trim() || fromGps.address,
        region: input.region?.trim() || fromGps.region,
      };
    }
    return {
      latitude: input.latitude,
      longitude: input.longitude,
      address: input.address?.trim() || null,
      region:
        input.region?.trim() ||
        (isInUzbekistan(input.latitude, input.longitude)
          ? nearestUzRegion(input.latitude, input.longitude)
          : null),
    };
  }

  if (input.address?.trim()) {
    const fromAddress = await geocodeAddress(input.address);
    if (fromAddress) {
      return {
        latitude: fromAddress.latitude,
        longitude: fromAddress.longitude,
        address: fromAddress.displayName || fromAddress.address,
        region: input.region?.trim() || fromAddress.region,
      };
    }
    return {
      latitude: null,
      longitude: null,
      address: input.address.trim(),
      region: input.region?.trim() || null,
    };
  }

  return {
    latitude: null,
    longitude: null,
    address: null,
    region: input.region?.trim() || null,
  };
}
