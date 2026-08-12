"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { SupportChatPanel } from "@/components/support-chat-panel";
import { usePlatformRealtime } from "@/hooks/use-platform-realtime";

type InboxRow = {
  cafeId: string;
  cafeName: string;
  conversationId: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
};

export function PlatformSupportInbox() {
  const searchParams = useSearchParams();
  const cafeFromUrl = searchParams.get("cafe");
  const [rows, setRows] = useState<InboxRow[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(cafeFromUrl);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/platform/support");
    if (!res.ok) return;
    const data = await res.json();
    const list: InboxRow[] = data.conversations ?? [];
    setRows(list);
    setSelectedCafeId((prev) => {
      const preferred = cafeFromUrl || prev;
      if (preferred && list.some((r) => r.cafeId === preferred)) return preferred;
      return list[0]?.cafeId ?? null;
    });
    setLoading(false);
  }, [cafeFromUrl]);

  useEffect(() => {
    if (cafeFromUrl) setSelectedCafeId(cafeFromUrl);
  }, [cafeFromUrl]);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 8000);
    return () => clearInterval(t);
  }, [load]);

  usePlatformRealtime(
    (event) => {
      if (event.type === "support.message") void load();
    },
    { enabled: true },
  );

  const selected = rows.find((r) => r.cafeId === selectedCafeId);

  return (
    <div className="platform-support-layout">
      <aside className="platform-support-list">
        <p className="platform-support-list-title">Suhbatlar</p>
        {loading ? (
          <p className="platform-support-empty">Yuklanmoqda...</p>
        ) : rows.length === 0 ? (
          <p className="platform-support-empty">Hali xabar yo&apos;q</p>
        ) : (
          rows.map((row) => (
            <button
              key={row.cafeId}
              type="button"
              onClick={() => setSelectedCafeId(row.cafeId)}
              className={`platform-support-list-item ${
                selectedCafeId === row.cafeId ? "is-active" : ""
              }`}
            >
              <div className="platform-support-list-head">
                <span className="platform-support-cafe-name">{row.cafeName}</span>
                {row.unreadCount > 0 && (
                  <span className="platform-support-badge">{row.unreadCount}</span>
                )}
              </div>
              <p className="platform-support-preview">{row.lastMessage || "—"}</p>
              <p className="platform-support-time">
                {new Date(row.lastAt).toLocaleString("uz-UZ", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </button>
          ))
        )}
      </aside>
      <section className="platform-support-thread">
        {selected ? (
          <>
            <header className="platform-support-thread-head">
              <MessageCircle className="h-5 w-5 text-violet-600" />
              <div>
                <p className="font-semibold text-stone-900">{selected.cafeName}</p>
                <p className="text-xs text-stone-500">
                  Mijoz o&apos;qiganda ✓✓ ko&apos;rinadi
                </p>
              </div>
            </header>
            <SupportChatPanel
              cafeId={selected.cafeId}
              viewer="platform"
              apiBase={`/api/platform/support/${selected.cafeId}`}
            />
          </>
        ) : (
          <div className="platform-support-empty-thread">
            <MessageCircle className="h-10 w-10 text-stone-300" />
            <p>Suhbatni tanlang</p>
          </div>
        )}
      </section>
    </div>
  );
}
