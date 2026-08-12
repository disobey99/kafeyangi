import type { CafeMusicTrack } from "@/lib/cafe-music-suggestions";
import { trackKey } from "@/lib/cafe-music-suggestions";

const storageKey = (cafeId: string) => `cafe-music-favorites:${cafeId}`;

export function readMusicFavorites(cafeId: string): CafeMusicTrack[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(cafeId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is CafeMusicTrack =>
        !!t &&
        typeof t === "object" &&
        typeof (t as CafeMusicTrack).title === "string" &&
        typeof (t as CafeMusicTrack).artist === "string",
    );
  } catch {
    return [];
  }
}

export function writeMusicFavorites(cafeId: string, list: CafeMusicTrack[]) {
  if (typeof window === "undefined") return;
  // Deduplicate
  const seen = new Set<string>();
  const next: CafeMusicTrack[] = [];
  for (const t of list) {
    const k = trackKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    next.push({
      title: t.title,
      artist: t.artist,
      vibe: typeof t.vibe === "string" ? t.vibe : "",
    });
  }
  localStorage.setItem(storageKey(cafeId), JSON.stringify(next));
}

export function toggleMusicFavorite(
  cafeId: string,
  track: CafeMusicTrack,
): CafeMusicTrack[] {
  const current = readMusicFavorites(cafeId);
  const key = trackKey(track);
  const exists = current.some((t) => trackKey(t) === key);
  const next = exists
    ? current.filter((t) => trackKey(t) !== key)
    : [...current, track];
  writeMusicFavorites(cafeId, next);
  return next;
}
