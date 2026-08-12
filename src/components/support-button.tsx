"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  BookOpen,
  Headphones,
  Mail,
  MessageCircle,
  Phone,
  X,
} from "lucide-react";
import { SupportChatPanel } from "@/components/support-chat-panel";
import { useTheme } from "@/components/theme-provider";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import {
  SUPPORT_HELP_TOPICS,
  type SupportHelpTopic,
} from "@/lib/support-help-topics";

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

type SupportInfo = {
  title: string;
  phone: string;
  telegram: string;
  instagram: string;
  email: string;
};

type Tab = "chat" | "contact";
type ChatStep = "topics" | "guide" | "live";

export function SupportButton({
  className = "",
  cafeId,
}: {
  className?: string;
  cafeId?: string;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const { resolvedTheme } = useTheme();
  const [domDark, setDomDark] = useState(false);
  const isDark = resolvedTheme === "dark" || domDark;

  useEffect(() => {
    const sync = () =>
      setDomDark(document.documentElement.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chat");
  const [chatStep, setChatStep] = useState<ChatStep>("topics");
  const [activeTopic, setActiveTopic] = useState<SupportHelpTopic | null>(null);
  const [mounted, setMounted] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});
  const [support, setSupport] = useState<SupportInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatUnread, setChatUnread] = useState(0);

  const loadChatUnread = useCallback(async () => {
    if (!cafeId || open) {
      if (open) setChatUnread(0);
      return;
    }
    try {
      const res = await fetch(`/api/notifications?cafeId=${encodeURIComponent(cafeId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const count = (data.notifications ?? []).filter(
        (n: { kind: string; readAt: string | null }) => n.kind === "SUPPORT" && !n.readAt,
      ).length;
      setChatUnread(count);
    } catch {
      /* ignore */
    }
  }, [cafeId, open]);

  useEffect(() => {
    setMounted(true);
    void fetch("/api/support")
      .then((r) => r.json())
      .then((d) => setSupport(d.support ?? null))
      .catch(() => setSupport(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void loadChatUnread();
    if (!cafeId) return;
    const t = setInterval(() => void loadChatUnread(), 20_000);
    return () => clearInterval(t);
  }, [cafeId, loadChatUnread]);

  useCafeRealtime(
    cafeId ?? "",
    (event) => {
      if (event.type === "support.message") void loadChatUnread();
    },
    { enabled: Boolean(cafeId) && !open },
  );

  const hasContact =
    support &&
    (support.phone || support.telegram || support.instagram || support.email);
  const hasChat = Boolean(cafeId);
  const showTabs = hasChat && hasContact;
  const activeTab: Tab = !hasChat ? "contact" : !hasContact ? "chat" : tab;
  const panelHeight =
    activeTab === "chat" ? (chatStep === "live" ? 480 : 440) : 300;

  function updatePanelPosition() {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = Math.min(activeTab === "chat" ? 380 : 320, window.innerWidth - 16);
    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
    const spaceBelow = window.innerHeight - r.bottom - 12;
    const spaceAbove = r.top - 12;

    if (spaceBelow >= panelHeight || spaceBelow >= spaceAbove) {
      setPanelStyle({
        position: "fixed",
        left,
        top: r.bottom + 8,
        width,
        zIndex: 9999,
      });
    } else {
      setPanelStyle({
        position: "fixed",
        left,
        bottom: window.innerHeight - r.top + 8,
        width,
        zIndex: 9999,
      });
    }
  }

  function resetChatFlow() {
    setChatStep("topics");
    setActiveTopic(null);
  }

  function toggleOpen() {
    if (!open) {
      setTab("chat");
      resetChatFlow();
      updatePanelPosition();
    }
    setOpen((v) => !v);
  }

  function selectTopic(topic: SupportHelpTopic) {
    if (topic.openChat) {
      setActiveTopic(null);
      setChatStep("live");
      return;
    }
    setActiveTopic(topic);
    setChatStep("guide");
  }

  useEffect(() => {
    if (!open) return;
    updatePanelPosition();
    const onResize = () => updatePanelPosition();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, activeTab, chatStep]);

  if (loading) return null;
  if (!hasChat && !hasContact) return null;

  const title = support?.title ?? "Qo'llab-quvvatlash";

  const chatSubtitle =
    chatStep === "live"
      ? "Operator bilan yozing — tez javob olasiz"
      : chatStep === "guide"
        ? "Qisqa yo'riqnoma"
        : "Qanday muammo? Birini tanlang";

  const panel = open && mounted ? (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[9998] bg-black/25"
        aria-label="Yopish"
        onClick={() => setOpen(false)}
      />
      <div
        style={panelStyle}
        className={`support-popup ${isDark ? "support-popup--dark" : ""}`}
        data-theme={isDark ? "dark" : "light"}
        role="dialog"
        aria-label={title}
      >
        <div className="support-popup-head">
          <div className="min-w-0">
            <p className="support-popup-title">{title}</p>
            <p className="support-popup-subtitle">
              {activeTab === "chat" ? chatSubtitle : "Telefon yoki ijtimoiy tarmoq orqali"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="support-popup-close"
            aria-label="Yopish"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {showTabs && (
          <div className="support-popup-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "chat"}
              className={activeTab === "chat" ? "is-active" : ""}
              onClick={() => {
                setTab("chat");
                resetChatFlow();
              }}
            >
              <MessageCircle className="h-4 w-4" />
              Yordam / Chat
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "contact"}
              className={activeTab === "contact" ? "is-active" : ""}
              onClick={() => setTab("contact")}
            >
              <Phone className="h-4 w-4" />
              Aloqa
            </button>
          </div>
        )}

        <div className="support-popup-body">
          {activeTab === "chat" && hasChat ? (
            chatStep === "live" ? (
              <div className="support-chat-live">
                <button
                  type="button"
                  className="support-back-btn"
                  onClick={resetChatFlow}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Savollarga qaytish
                </button>
                <SupportChatPanel
                  key="chat"
                  cafeId={cafeId!}
                  viewer="cafe"
                  apiBase={`/api/support/chat?cafeId=${encodeURIComponent(cafeId!)}`}
                  variant="popup"
                />
              </div>
            ) : chatStep === "guide" && activeTopic ? (
              <div className="support-guide">
                <button
                  type="button"
                  className="support-back-btn"
                  onClick={resetChatFlow}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Orqaga
                </button>
                <div className="support-guide-title">
                  <BookOpen className="h-4 w-4 shrink-0 text-emerald-500" />
                  <h3>{activeTopic.title ?? activeTopic.label}</h3>
                </div>
                <ol className="support-guide-steps">
                  {(activeTopic.steps ?? []).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                {activeTopic.tip && (
                  <p className="support-guide-tip">{activeTopic.tip}</p>
                )}
                <button
                  type="button"
                  className="support-guide-chat-btn"
                  onClick={() => setChatStep("live")}
                >
                  <MessageCircle className="h-4 w-4" />
                  Operatorga yozish
                </button>
              </div>
            ) : (
              <div className="support-topics">
                <p className="support-topics-label">Sizda qanday muammo?</p>
                <div className="support-topics-list">
                  {SUPPORT_HELP_TOPICS.map((topic) => (
                    <button
                      key={topic.id}
                      type="button"
                      className={`support-topic-btn ${topic.openChat ? "is-chat" : ""}`}
                      onClick={() => selectTopic(topic)}
                    >
                      {topic.openChat ? (
                        <MessageCircle className="h-4 w-4 shrink-0" />
                      ) : (
                        <BookOpen className="h-4 w-4 shrink-0 opacity-70" />
                      )}
                      <span>{topic.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : hasContact && support ? (
            <div key="contact" className="support-popup-contacts">
              {support.phone && (
                <a href={`tel:${support.phone.replace(/[^\d+]/g, "")}`} className="support-contact-link">
                  <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{support.phone}</span>
                </a>
              )}
              {support.telegram && (
                <a
                  href={support.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="support-contact-link"
                >
                  <TelegramIcon className="h-4 w-4 shrink-0 text-sky-500" />
                  <span>Telegram</span>
                </a>
              )}
              {support.instagram && (
                <a
                  href={support.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="support-contact-link"
                >
                  <InstagramIcon className="h-4 w-4 shrink-0 text-pink-500" />
                  <span>Instagram</span>
                </a>
              )}
              {support.email && (
                <a href={`mailto:${support.email}`} className="support-contact-link">
                  <Mail className="h-4 w-4 shrink-0 text-violet-500" />
                  <span>{support.email}</span>
                </a>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        className="relative inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98] dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-stone-950"
      >
        <Headphones className="h-4 w-4" />
        {title}
        {chatUnread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            {chatUnread > 9 ? "9+" : chatUnread}
          </span>
        )}
      </button>
      {mounted && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
