"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCheck, ChevronLeft, Reply, Send, X } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";

export type GroupChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  replyToId?: string | null;
  createdAt: string | Date;
  replyTo?: { id: string; senderName: string; text: string } | null;
  reads?: Array<{ userId: string; userName: string; readAt: string | Date }>;
  readCount?: number;
};

type OnlineUser = { userId: string; userName: string };
type TypingUser = { userId: string; userName: string };

function formatTime(value: string | Date) {
  return new Date(value).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTypingLabel(typing: TypingUser[]) {
  if (typing.length === 0) return "";
  if (typing.length === 1) return `${typing[0].userName} yozmoqda…`;
  if (typing.length === 2) {
    return `${typing[0].userName} va ${typing[1].userName} yozmoqda…`;
  }
  return `${typing.length} kishi yozmoqda…`;
}

export function StaffGroupChat({
  cafeId,
  userId,
  userName,
  onClose,
}: {
  cafeId: string;
  userId: string;
  userName: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [typing, setTyping] = useState<TypingUser[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<GroupChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [readersFor, setReadersFor] = useState<GroupChatMessage | null>(null);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cafes/${cafeId}/chat`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return;
    const next = (data.messages ?? []) as GroupChatMessage[];
    knownIds.current = new Set(next.map((m) => m.id));
    setMessages(next);
    setOnline(data.online ?? []);
    setTyping(
      ((data.typing ?? []) as TypingUser[]).filter((t) => t.userId !== userId),
    );
    scrollToBottom();
  }, [cafeId, scrollToBottom, userId]);

  const markRead = useCallback(
    async (ids: string[]) => {
      const unique = [...new Set(ids)].filter(Boolean);
      if (unique.length === 0) return;
      await fetch(`/api/cafes/${cafeId}/chat/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageIds: unique }),
      }).catch(() => {});
    },
    [cafeId],
  );

  const pingPresence = useCallback(
    async (typingFlag = false) => {
      await fetch(`/api/cafes/${cafeId}/chat/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: typingFlag }),
      }).catch(() => {});
    },
    [cafeId],
  );

  useEffect(() => {
    void load();
    void pingPresence(false);
    presenceTimer.current = setInterval(() => void pingPresence(false), 15_000);
    return () => {
      if (presenceTimer.current) clearInterval(presenceTimer.current);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      void fetch(`/api/cafes/${cafeId}/chat/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: false }),
      }).catch(() => {});
    };
  }, [load, pingPresence, cafeId]);

  useEffect(() => {
    const unreadIds = messages
      .filter((m) => m.senderId !== userId)
      .filter((m) => !(m.reads ?? []).some((r) => r.userId === userId))
      .map((m) => m.id);
    if (unreadIds.length) void markRead(unreadIds);
  }, [messages, userId, markRead]);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "ops.chat.created") {
      const msg = (event.payload as { message?: GroupChatMessage } | undefined)
        ?.message;
      if (!msg?.id) {
        void load();
        return;
      }
      if (knownIds.current.has(msg.id)) return;
      knownIds.current.add(msg.id);
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      if (msg.senderId !== userId) void markRead([msg.id]);
      return;
    }
    if (event.type === "ops.chat.read") {
      const payload = event.payload as
        | {
            byMsg?: Record<
              string,
              Array<{ userId: string; userName: string; readAt: string | Date }>
            >;
          }
        | undefined;
      if (!payload?.byMsg) return;
      setMessages((prev) =>
        prev.map((m) => {
          const reads = payload.byMsg?.[m.id];
          if (!reads) return m;
          return { ...m, reads, readCount: reads.length };
        }),
      );
      return;
    }
    if (event.type === "ops.chat.typing" || event.type === "ops.chat.presence") {
      const payload = event.payload as
        | { online?: OnlineUser[]; typing?: TypingUser[] }
        | undefined;
      if (payload?.online) setOnline(payload.online);
      if (payload?.typing) {
        setTyping(payload.typing.filter((t) => t.userId !== userId));
      }
    }
  });

  function onTextChange(value: string) {
    setText(value);
    void pingPresence(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      void pingPresence(false);
    }, 2500);
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          replyToId: replyTo?.id ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Yuborib bo'lmadi");
        return;
      }
      setText("");
      setReplyTo(null);
      void pingPresence(false);
      if (data.message?.id && !knownIds.current.has(data.message.id)) {
        knownIds.current.add(data.message.id);
        setMessages((prev) => [...prev, data.message as GroupChatMessage]);
        scrollToBottom();
      }
    } catch {
      setError("Tarmoq xatosi");
    } finally {
      setSending(false);
    }
  }

  const onlineOthers = useMemo(
    () => online.filter((u) => u.userId !== userId),
    [online, userId],
  );
  const subtitle = formatTypingLabel(typing)
    || `${Math.max(online.length, 1)} online`;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-[#0e1621] text-white">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 bg-[#17212b] px-2 py-2.5 pt-[max(0.65rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Orqaga"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">Ichki guruh</p>
          <p className="truncate text-xs text-sky-300/90">{subtitle}</p>
        </div>
        <div className="pr-2 text-right text-[11px] text-white/50">
          {onlineOthers.length > 0
            ? onlineOthers
                .slice(0, 2)
                .map((u) => u.userName.split(" ")[0])
                .join(", ")
            : userName.split(" ")[0]}
        </div>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-3"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at top, rgba(36,129,204,0.08), transparent 55%)",
        }}
      >
        {messages.map((m) => {
          const mine = m.senderId === userId;
          const otherReads = (m.reads ?? []).filter((r) => r.userId !== m.senderId);
          const isRead = otherReads.length > 0;
          return (
            <div
              key={m.id}
              className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
            >
              {!mine && (
                <span className="mb-0.5 px-1 text-[11px] font-semibold text-sky-300/90">
                  {m.senderName}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  if (mine && isRead) setReadersFor(m);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setReplyTo(m);
                }}
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-left text-[15px] leading-snug shadow-sm ${
                  mine
                    ? "rounded-br-md bg-[#8774e1] text-white"
                    : "rounded-bl-md bg-[#182533] text-white"
                }`}
              >
                {m.replyTo && (
                  <div
                    className={`mb-1.5 border-l-2 pl-2 text-[12px] ${
                      mine ? "border-white/50 text-white/85" : "border-sky-400 text-sky-200/90"
                    }`}
                  >
                    <p className="font-semibold">{m.replyTo.senderName}</p>
                    <p className="line-clamp-2 opacity-90">{m.replyTo.text}</p>
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <div
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                    mine ? "text-white/75" : "text-white/45"
                  }`}
                >
                  <span>{formatTime(m.createdAt)}</span>
                  {mine &&
                    (isRead ? (
                      <CheckCheck className="h-3.5 w-3.5 text-sky-200" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    ))}
                </div>
              </button>
              <button
                type="button"
                onClick={() => setReplyTo(m)}
                className="mt-0.5 inline-flex items-center gap-1 px-1 text-[10px] text-white/40 hover:text-sky-300"
              >
                <Reply className="h-3 w-3" />
                Javob
              </button>
            </div>
          );
        })}
      </div>

      {replyTo && (
        <div className="flex items-start gap-2 border-t border-white/10 bg-[#17212b] px-3 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-[#8774e1] pl-2">
            <p className="text-xs font-semibold text-[#8774e1]">
              {replyTo.senderName} ga javob
            </p>
            <p className="truncate text-xs text-white/60">{replyTo.text}</p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTo(null)}
            className="rounded-lg p-1 text-white/50 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="bg-red-500/20 px-3 py-1 text-xs text-red-200">{error}</p>
      )}

      <form
        className="flex shrink-0 items-end gap-2 border-t border-white/10 bg-[#17212b] px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Xabar yozing…"
          maxLength={1000}
          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#0e1621] px-4 py-2.5 text-[15px] text-white outline-none placeholder:text-white/35 focus:border-[#8774e1]"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8774e1] text-white disabled:opacity-40"
          aria-label="Yuborish"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>

      {readersFor && (
        <div
          className="absolute inset-0 z-20 flex items-end bg-black/50 sm:items-center sm:justify-center"
          onClick={() => setReadersFor(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-t-2xl bg-[#17212b] p-4 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <p className="mb-3 text-sm font-bold">Kim o&apos;qigan</p>
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {(readersFor.reads ?? [])
                .filter((r) => r.userId !== readersFor.senderId)
                .map((r) => (
                  <li
                    key={r.userId}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>{r.userName}</span>
                    <span className="text-xs text-white/45">{formatTime(r.readAt)}</span>
                  </li>
                ))}
              {(readersFor.reads ?? []).filter(
                (r) => r.userId !== readersFor.senderId,
              ).length === 0 && (
                <li className="text-sm text-white/45">Hali hech kim o&apos;qimagan</li>
              )}
            </ul>
            <button
              type="button"
              onClick={() => setReadersFor(null)}
              className="mt-4 w-full rounded-xl bg-white/10 py-2.5 text-sm font-semibold"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
