/** In-memory chat presence + typing (SSE orqali tarqatiladi) */

type PresenceEntry = { userId: string; userName: string; at: number };
type TypingEntry = { userId: string; userName: string; at: number };

const globalStore = globalThis as unknown as {
  __chatPresence?: Map<string, Map<string, PresenceEntry>>;
  __chatTyping?: Map<string, Map<string, TypingEntry>>;
};

function presenceMap() {
  if (!globalStore.__chatPresence) globalStore.__chatPresence = new Map();
  return globalStore.__chatPresence;
}

function typingMap() {
  if (!globalStore.__chatTyping) globalStore.__chatTyping = new Map();
  return globalStore.__chatTyping;
}

const ONLINE_MS = 45_000;
const TYPING_MS = 4_000;

export function touchChatPresence(
  cafeId: string,
  userId: string,
  userName: string,
) {
  const cafes = presenceMap();
  if (!cafes.has(cafeId)) cafes.set(cafeId, new Map());
  cafes.get(cafeId)!.set(userId, { userId, userName, at: Date.now() });
}

export function listChatOnline(cafeId: string) {
  const now = Date.now();
  const cafe = presenceMap().get(cafeId);
  if (!cafe) return [] as PresenceEntry[];
  const out: PresenceEntry[] = [];
  for (const [id, entry] of cafe) {
    if (now - entry.at > ONLINE_MS) {
      cafe.delete(id);
      continue;
    }
    out.push(entry);
  }
  return out.sort((a, b) => a.userName.localeCompare(b.userName));
}

export function setChatTyping(
  cafeId: string,
  userId: string,
  userName: string,
) {
  const cafes = typingMap();
  if (!cafes.has(cafeId)) cafes.set(cafeId, new Map());
  cafes.get(cafeId)!.set(userId, { userId, userName, at: Date.now() });
}

export function clearChatTyping(cafeId: string, userId: string) {
  typingMap().get(cafeId)?.delete(userId);
}

export function listChatTyping(cafeId: string, exceptUserId?: string) {
  const now = Date.now();
  const cafe = typingMap().get(cafeId);
  if (!cafe) return [] as TypingEntry[];
  const out: TypingEntry[] = [];
  for (const [id, entry] of cafe) {
    if (now - entry.at > TYPING_MS) {
      cafe.delete(id);
      continue;
    }
    if (exceptUserId && id === exceptUserId) continue;
    out.push(entry);
  }
  return out;
}
