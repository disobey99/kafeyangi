"use client";

import Script from "next/script";
import { TelegramWebAppInit } from "@/lib/telegram-web-app";

export default function TgLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[var(--tg-viewport-height,100dvh)] bg-stone-100 text-stone-900">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <TelegramWebAppInit />
      {children}
    </div>
  );
}
