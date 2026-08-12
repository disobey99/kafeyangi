/** Tashqi musiqa tizimlarisiz — kengaytirilgan pool + kunlik tavsiya */

export type CafeDayPart = "morning" | "midday" | "afternoon" | "evening" | "late";

export type CafeMusicTrack = {
  title: string;
  artist: string;
  vibe: string;
};

export type CafeDayPartMeta = {
  id: CafeDayPart;
  label: string;
  hours: string;
  mood: string;
  tip: string;
};

export type CafeDayPartSuggestion = CafeDayPartMeta & {
  tracks: CafeMusicTrack[];
};

export const CAFE_DAY_PART_META: CafeDayPartMeta[] = [
  {
    id: "morning",
    label: "Ertalab",
    hours: "07:00 – 11:00",
    mood: "Yumshoq uyg'onish, jazz / acoustic / yengil klassika",
    tip: "Past ovozda instrumental — suhbatga xalaqit bermaydi.",
  },
  {
    id: "midday",
    label: "Kunduz",
    hours: "11:00 – 14:00",
    mood: "Jonli, lekin tinch — lunch rush",
    tip: "Biroz ritmli pop/indie; ovozni oshirmang.",
  },
  {
    id: "afternoon",
    label: "Tushdan keyin",
    hours: "14:00 – 17:00",
    mood: "Klassik piano, ambient, chill",
    tip: "Instrumental klassika va lo-fi — ish/o'qish uchun ideal.",
  },
  {
    id: "evening",
    label: "Kechqurun",
    hours: "17:00 – 21:00",
    mood: "Iliq soul, soft jazz, romantik klassika",
    tip: "Kechki mehmonlar uchun biroz romantik ohang.",
  },
  {
    id: "late",
    label: "Kechki soat",
    hours: "21:00 – 07:00",
    mood: "Past ovozda ambient / piano night",
    tip: "Juda past volume; yopilish oldidan tinch treklar.",
  },
];

/** Har kun qismi uchun kengaytirilgan pool (kunlik tanlov shu yerdan) */
export const CAFE_MUSIC_POOL: Record<CafeDayPart, CafeMusicTrack[]> = {
  morning: [
    { title: "Sunday Morning", artist: "Maroon 5", vibe: "yorug', yengil" },
    { title: "Put It All On Me", artist: "Ed Sheeran", vibe: "iliq acoustic" },
    { title: "Come Away With Me", artist: "Norah Jones", vibe: "yumshoq jazz" },
    { title: "Better Together", artist: "Jack Johnson", vibe: "qahva kayfiyati" },
    { title: "Banana Pancakes", artist: "Jack Johnson", vibe: "ertalabki energiya" },
    { title: "La Vie En Rose", artist: "Louis Armstrong", vibe: "klassik kafe" },
    { title: "What a Wonderful World", artist: "Louis Armstrong", vibe: "iliq klassika" },
    { title: "Don't Know Why", artist: "Norah Jones", vibe: "ertalabki jazz" },
    { title: "Bubbly", artist: "Colbie Caillat", vibe: "yengil acoustic" },
    { title: "Ho Hey", artist: "The Lumineers", vibe: "folk yengil" },
    { title: "Photograph", artist: "Ed Sheeran", vibe: "yumshoq pop" },
    { title: "Somewhere Over the Rainbow", artist: "Israel Kamakawiwoʻole", vibe: "ukulele tinchlik" },
    { title: "Clair de Lune", artist: "Claude Debussy", vibe: "klassik piano" },
    { title: "Arabesque No.1", artist: "Claude Debussy", vibe: "yorug' klassika" },
    { title: "Morning Mood", artist: "Edvard Grieg", vibe: "ertalabki klassika" },
    { title: "Air on the G String", artist: "J.S. Bach", vibe: "barok yumshoq" },
    { title: "Canon in D", artist: "Johann Pachelbel", vibe: "klassik tinchlik" },
    { title: "The Girl from Ipanema", artist: "Stan Getz & Astrud Gilberto", vibe: "bossa nova" },
  ],
  midday: [
    { title: "Happy", artist: "Pharrell Williams", vibe: "ijobiy" },
    { title: "Count on Me", artist: "Bruno Mars", vibe: "yengil pop" },
    { title: "Home", artist: "Edward Sharpe & The Magnetic Zeros", vibe: "indie folk" },
    { title: "Budapest", artist: "George Ezra", vibe: "quvnoq" },
    { title: "Riptide", artist: "Vance Joy", vibe: "ukulele vibe" },
    { title: "I'm Yours", artist: "Jason Mraz", vibe: "klassik kafe" },
    { title: "Three Little Birds", artist: "Bob Marley", vibe: "yorug' reggae" },
    { title: "Walking on Sunshine", artist: "Katrina and the Waves", vibe: "quvnoq" },
    { title: "Here Comes the Sun", artist: "The Beatles", vibe: "kunduz yorug'ligi" },
    { title: "Lovely Day", artist: "Bill Withers", vibe: "iliq soul" },
    { title: "Shut Up and Dance", artist: "Walk the Moon", vibe: "jonli (pas ovoz)" },
    { title: "Best Day of My Life", artist: "American Authors", vibe: "energik folk-pop" },
    { title: "Feel It Still", artist: "Portugal. The Man", vibe: "yengil groove" },
    { title: "Stolen Dance", artist: "Milky Chance", vibe: "chill pop" },
    { title: "Ophelia", artist: "The Lumineers", vibe: "indie" },
    { title: "Una Mattina", artist: "Ludovico Einaudi", vibe: "kunduzgi piano" },
    { title: "Gymnopédie No.1", artist: "Erik Satie", vibe: "minimal klassika" },
  ],
  afternoon: [
    { title: "Nuvole Bianche", artist: "Ludovico Einaudi", vibe: "klassik modern" },
    { title: "Experience", artist: "Ludovico Einaudi", vibe: "piano ambient" },
    { title: "Primavera", artist: "Ludovico Einaudi", vibe: "yorug' piano" },
    { title: "Divenire", artist: "Ludovico Einaudi", vibe: "chuqur piano" },
    { title: "I Giorni", artist: "Ludovico Einaudi", vibe: "yumshoq klassika" },
    { title: "River Flows in You", artist: "Yiruma", vibe: "yumshoq piano" },
    { title: "Kiss the Rain", artist: "Yiruma", vibe: "romantik piano" },
    { title: "May Be", artist: "Yiruma", vibe: "tinch piano" },
    { title: "Comptine d'un autre été", artist: "Yann Tiersen", vibe: "film soundtrack" },
    { title: "La Valse d'Amélie", artist: "Yann Tiersen", vibe: "fransuz piano" },
    { title: "Gymnopédie No.1", artist: "Erik Satie", vibe: "minimal" },
    { title: "Gnossienne No.1", artist: "Erik Satie", vibe: "klassik ambient" },
    { title: "Clair de Lune", artist: "Claude Debussy", vibe: "impressionist" },
    { title: "Rêverie", artist: "Claude Debussy", vibe: "orzu ohangi" },
    { title: "Nocturne Op.9 No.2", artist: "Frédéric Chopin", vibe: "romantik klassika" },
    { title: "Prelude in E minor Op.28 No.4", artist: "Frédéric Chopin", vibe: "sokin piano" },
    { title: "The Swan", artist: "Camille Saint-Saëns", vibe: "yumshoq klassika" },
    { title: "Méditation", artist: "Jules Massenet", vibe: "skripka tinchlik" },
    { title: "Ave Maria", artist: "Franz Schubert", vibe: "muqaddas tinchlik" },
    { title: "Canon in D", artist: "Johann Pachelbel", vibe: "klassik tinchlik" },
    { title: "Air on the G String", artist: "J.S. Bach", vibe: "barok" },
    { title: "Jesu, Joy of Man's Desiring", artist: "J.S. Bach", vibe: "yorug' barok" },
    { title: "Spiegel im Spiegel", artist: "Arvo Pärt", vibe: "minimal ambient" },
    { title: "Weightless", artist: "Marconi Union", vibe: "chuqur tinchlik" },
    { title: "OvO", artist: "Max Richter", vibe: "modern klassika" },
    { title: "On the Nature of Daylight", artist: "Max Richter", vibe: "chuqur ambient" },
  ],
  evening: [
    { title: "At Last", artist: "Etta James", vibe: "soul klassika" },
    { title: "L-O-V-E", artist: "Nat King Cole", vibe: "vintage jazz" },
    { title: "Fly Me to the Moon", artist: "Frank Sinatra", vibe: "swing" },
    { title: "The Way You Look Tonight", artist: "Frank Sinatra", vibe: "kechki swing" },
    { title: "Valerie", artist: "Amy Winehouse", vibe: "soul/pop" },
    { title: "Just the Two of Us", artist: "Bill Withers", vibe: "yumshoq groove" },
    { title: "Sway", artist: "Michael Bublé", vibe: "kechki jazz" },
    { title: "Feeling Good", artist: "Nina Simone", vibe: "kuchli soul" },
    { title: "Summertime", artist: "Ella Fitzgerald", vibe: "jazz standart" },
    { title: "Moon River", artist: "Audrey Hepburn", vibe: "romantik" },
    { title: "Unchained Melody", artist: "The Righteous Brothers", vibe: "klassik ballada" },
    { title: "Nuvole Bianche", artist: "Ludovico Einaudi", vibe: "kechki piano" },
    { title: "Una Mattina", artist: "Ludovico Einaudi", vibe: "iliq piano" },
    { title: "Experience", artist: "Ludovico Einaudi", vibe: "kechki ambient" },
    { title: "Nocturne Op.9 No.2", artist: "Frédéric Chopin", vibe: "kechki klassika" },
    { title: "Clair de Lune", artist: "Claude Debussy", vibe: "oy nuri" },
    { title: "The Swan", artist: "Camille Saint-Saëns", vibe: "yumshoq" },
    { title: "River Flows in You", artist: "Yiruma", vibe: "romantik piano" },
    { title: "La Vie En Rose", artist: "Édith Piaf", vibe: "fransuz kech" },
  ],
  late: [
    { title: "Nuvole Bianche", artist: "Ludovico Einaudi", vibe: "tungi piano" },
    { title: "Spiegel im Spiegel", artist: "Arvo Pärt", vibe: "chuqur tinchlik" },
    { title: "On the Nature of Daylight", artist: "Max Richter", vibe: "kechki ambient" },
    { title: "Experience", artist: "Ludovico Einaudi", vibe: "kechki piano" },
    { title: "Holocene", artist: "Bon Iver", vibe: "sokin indie" },
    { title: "Skinny Love", artist: "Bon Iver", vibe: "past energiya" },
    { title: "To Build a Home", artist: "The Cinematic Orchestra", vibe: "chuqur, tinch" },
    { title: "Intro", artist: "The xx", vibe: "minimal night" },
    { title: "Nightcall", artist: "Kavinsky", vibe: "kechki ambient (yumshoq)" },
    { title: "Midnight City", artist: "M83", vibe: "kechki atmosfera" },
    { title: "Clair de Lune", artist: "Claude Debussy", vibe: "tungi klassika" },
    { title: "Gymnopédie No.1", artist: "Erik Satie", vibe: "minimal tun" },
    { title: "Gnossienne No.1", artist: "Erik Satie", vibe: "tungi ambient" },
    { title: "Nocturne Op.9 No.2", artist: "Frédéric Chopin", vibe: "nocturne" },
    { title: "The Swan", artist: "Camille Saint-Saëns", vibe: "sokin" },
    { title: "Ave Maria", artist: "Franz Schubert", vibe: "tinchlik" },
    { title: "Weightless", artist: "Marconi Union", vibe: "uyqu oldidan" },
    { title: "Comptine d'un autre été", artist: "Yann Tiersen", vibe: "kechki piano" },
  ],
};

/** Orqaga moslik: meta + to'liq pool (UI tablar uchun) */
export const CAFE_MUSIC_BY_DAY_PART: CafeDayPartSuggestion[] = CAFE_DAY_PART_META.map(
  (meta) => ({
    ...meta,
    tracks: CAFE_MUSIC_POOL[meta.id],
  }),
);

export const DAILY_SUGGESTION_COUNT = 6;

export function trackKey(t: Pick<CafeMusicTrack, "title" | "artist">): string {
  return `${t.title.trim().toLowerCase()}::${t.artist.trim().toLowerCase()}`;
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const arr = [...items];
  let s = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dateSeedKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Kunlik tavsiya: har kuni boshqa 6 ta (pooldan), seed = sana + kun qismi */
export function pickDailyTracks(
  dayPart: CafeDayPart,
  now = new Date(),
  count = DAILY_SUGGESTION_COUNT,
): CafeMusicTrack[] {
  const pool = CAFE_MUSIC_POOL[dayPart] ?? [];
  if (pool.length === 0) return [];
  const seed = hashSeed(`${dateSeedKey(now)}:${dayPart}`);
  return seededShuffle(pool, seed).slice(0, Math.min(count, pool.length));
}

/**
 * Ro'yxat: avval saralanganlar (doim), keyin kunlik tavsiyalar (takrorlarsiz).
 */
export function buildMusicList(
  dayPart: CafeDayPart,
  favorites: CafeMusicTrack[],
  now = new Date(),
  dailyCount = DAILY_SUGGESTION_COUNT,
): { favorites: CafeMusicTrack[]; daily: CafeMusicTrack[]; tracks: CafeMusicTrack[] } {
  const favKeys = new Set(favorites.map(trackKey));
  const daily = pickDailyTracks(dayPart, now, dailyCount).filter(
    (t) => !favKeys.has(trackKey(t)),
  );
  return {
    favorites,
    daily,
    tracks: [...favorites, ...daily],
  };
}

export function getCafeDayPart(hour = new Date().getHours()): CafeDayPart {
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "late";
}

export function getCafeMusicSuggestion(now = new Date()): CafeDayPartSuggestion {
  const part = getCafeDayPart(now.getHours());
  const meta = CAFE_DAY_PART_META.find((p) => p.id === part) ?? CAFE_DAY_PART_META[0];
  return { ...meta, tracks: pickDailyTracks(part, now) };
}
