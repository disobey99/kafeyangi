"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CheckCheck, Send } from "lucide-react";

type ChatMessage = {
  id: string;
  senderType: "CAFE" | "PLATFORM";
  senderName: string;
  text: string;
  createdAt: string;
  receipt?: "sent" | "read" | null;
};

function messagesEqual(a: ChatMessage[], b: ChatMessage[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if (
      x.id !== y.id ||
      x.text !== y.text ||
      x.receipt !== y.receipt ||
      x.senderType !== y.senderType
    ) {
      return false;
    }
  }
  return true;
}

function MessageReceipt({
  receipt,
  senderType,
  viewer,
}: {
  receipt?: "sent" | "read" | null;
  senderType: "CAFE" | "PLATFORM";
  viewer: "cafe" | "platform";
}) {
  if (viewer === "cafe") {
    if (senderType === "CAFE") {
      return <Check className="support-chat-tick" aria-label="Yuborildi" />;
    }
    return null;
  }

  if (senderType === "PLATFORM") {
    if (receipt === "read") {
      return <CheckCheck className="support-chat-tick is-read" aria-label="O'qildi" />;
    }
    return <Check className="support-chat-tick" aria-label="Yuborildi" />;
  }

  return null;
}

export function SupportChatPanel({
  cafeId,
  viewer,
  apiBase,
  variant = "page",
}: {
  cafeId: string;
  viewer: "cafe" | "platform";
  apiBase: string;
  variant?: "page" | "popup";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const lastMsgIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(apiBase);
    if (!res.ok) return;
    const data = await res.json();
    const next: ChatMessage[] = data.messages ?? [];
    setMessages((prev) => (messagesEqual(prev, next) ? prev : next));
    setLoading(false);
  }, [apiBase]);

  useEffect(() => {
    stickToBottomRef.current = true;
    lastMsgIdRef.current = null;
    setLoading(true);
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const lastId = messages[messages.length - 1]?.id ?? null;
    const firstPaint = lastMsgIdRef.current === null && messages.length > 0;
    lastMsgIdRef.current = lastId;

    if (!firstPaint && !stickToBottomRef.current) return;

    bottomRef.current?.scrollIntoView({
      behavior: firstPaint ? "auto" : "smooth",
    });
  }, [messages]);

  function onListScroll() {
    const el = listRef.current;
    if (!el) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = gap < 96;
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    stickToBottomRef.current = true;
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          viewer === "cafe" ? { cafeId, text: body } : { text: body },
        ),
      });
      if (res.ok) {
        setText("");
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`support-chat-panel ${variant === "popup" ? "is-popup" : ""}`}>
      <div
        ref={listRef}
        className="support-chat-messages"
        onScroll={onListScroll}
      >
        {loading ? (
          <p className="support-chat-empty">Yuklanmoqda...</p>
        ) : messages.length === 0 ? (
          <p className="support-chat-empty">
            Savolingizni yozing — texnik xodim javob beradi
          </p>
        ) : (
          messages.map((m) => {
            const mine =
              viewer === "cafe" ? m.senderType === "CAFE" : m.senderType === "PLATFORM";
            return (
              <div
                key={m.id}
                className={`support-chat-bubble ${mine ? "is-mine" : "is-theirs"}`}
              >
                {!mine && (
                  <p className="support-chat-sender">{m.senderName}</p>
                )}
                <p className="support-chat-text">{m.text}</p>
                <div className="support-chat-meta">
                  <span>
                    {new Date(m.createdAt).toLocaleString("uz-UZ", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <MessageReceipt
                    receipt={m.receipt}
                    senderType={m.senderType}
                    viewer={viewer}
                  />
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="support-chat-compose">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Xabar yozing..."
          rows={2}
          className="support-chat-input"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !text.trim()}
          className="support-chat-send"
          aria-label="Yuborish"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
