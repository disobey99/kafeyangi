"use client";

import type { PlatformEvent } from "@/lib/realtime";

type Listener = (event: PlatformEvent) => void;

type Connection = {
  es: EventSource;
  listeners: Set<Listener>;
  reconnectTimer?: ReturnType<typeof setTimeout>;
};

let connection: Connection | null = null;

function connect(): Connection {
  if (connection && connection.es.readyState !== EventSource.CLOSED) {
    return connection;
  }

  const listeners = connection?.listeners ?? new Set<Listener>();
  const es = new EventSource("/api/platform/events");
  const entry: Connection = { es, listeners };
  connection = entry;

  es.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data) as { type?: string };
      if (data.type === "ping" || data.type === "connected") return;
      listeners.forEach((fn) => fn(data as PlatformEvent));
    } catch {
      listeners.forEach((fn) => fn({ type: "support.message" }));
    }
  };

  es.onerror = () => {
    es.close();
    if (listeners.size === 0) {
      connection = null;
      return;
    }
    clearTimeout(entry.reconnectTimer);
    entry.reconnectTimer = setTimeout(() => {
      if (listeners.size > 0) connect();
    }, 3000);
  };

  return entry;
}

export function subscribePlatformEvents(listener: Listener) {
  const conn = connect();
  conn.listeners.add(listener);
  return () => {
    conn.listeners.delete(listener);
    if (conn.listeners.size === 0) {
      clearTimeout(conn.reconnectTimer);
      conn.es.close();
      connection = null;
    }
  };
}
