"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setText: (text: string) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
  };
  themeParams: Record<string, string>;
  colorScheme: "light" | "dark";
};

export function useTelegramWebApp() {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const api = window.Telegram?.WebApp;
    if (!api) return;
    api.ready();
    api.expand();
    api.setHeaderColor("#ffffff");
    api.setBackgroundColor("#f5f5f4");
    setTg(api);
  }, []);

  return tg;
}

export function TelegramWebAppInit() {
  useTelegramWebApp();
  return null;
}
