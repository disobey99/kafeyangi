"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle } from "lucide-react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { useHardwareBackHandler } from "@/hooks/use-hardware-back";
import { StaffGroupChat } from "@/components/staff-group-chat";

export function StaffChatWidget({
  cafeId,
  userId,
  userName,
  variant = "nav",
  className,
  label = "Chat",
}: {
  cafeId: string;
  userId: string;
  userName: string;
  variant?: "nav" | "fab" | "icon";
  className?: string;
  label?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const openRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    openRef.current = open;
    if (open) setUnread(0);
  }, [open]);

  useHardwareBackHandler(() => {
    if (!openRef.current) return false;
    setOpen(false);
    return true;
  }, open);

  useCafeRealtime(cafeId, (event) => {
    if (event.type !== "ops.chat.created") return;
    const msg = (event.payload as { message?: { senderId?: string } } | undefined)
      ?.message;
    if (openRef.current) return;
    if (msg?.senderId && msg.senderId === userId) return;
    setUnread((n) => n + 1);
  });

  const openChat = useCallback(() => setOpen(true), []);

  if (!mounted) {
    return (
      <button type="button" className={className ?? "cashier-pos-bottom-item"} disabled>
        <MessageCircle className="h-5 w-5" />
        <span>{label}</span>
      </button>
    );
  }

  const isDrawer = className?.includes("waiter-drawer-nav");
  const isCashierSide = className?.includes("cashier-pos-nav-item");
  const isWaiterBottom =
    className?.includes("font-black") && className?.includes("uppercase");

  const trigger = (
    <button
      type="button"
      onClick={openChat}
      className={className ?? "cashier-pos-bottom-item relative"}
      aria-label="Ichki chat"
      title="Ichki chat"
    >
      {variant === "icon" ? (
        <span className="relative inline-flex">
          <MessageCircle className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
      ) : isDrawer || isCashierSide ? (
        <>
          <MessageCircle className="h-4 w-4" />
          <span className="relative inline-flex items-center gap-1">
            {label}
            {unread > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
        </>
      ) : isWaiterBottom ? (
        <>
          <span className="relative flex items-center justify-center rounded-2xl px-4 py-1.5">
            <MessageCircle className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          <span>{label}</span>
        </>
      ) : (
        <>
          <span className="relative">
            <MessageCircle className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </span>
          <span>{label}</span>
        </>
      )}
    </button>
  );

  return (
    <>
      {variant === "fab" ? (
        <button
          type="button"
          onClick={openChat}
          className="fixed z-[89] flex h-[46px] w-[46px] items-center justify-center rounded-full bg-violet-600 text-white shadow-lg"
          style={{ left: 16, bottom: 80 }}
          title="Ichki chat"
        >
          <MessageCircle className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      ) : (
        trigger
      )}
      {open &&
        createPortal(
          <StaffGroupChat
            cafeId={cafeId}
            userId={userId}
            userName={userName}
            onClose={() => setOpen(false)}
          />,
          document.body,
        )}
    </>
  );
}
