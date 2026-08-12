"use client";

import type { CafeEvent } from "@/lib/realtime";

type Listener = (event: CafeEvent) => void;

type Connection = {
  es: EventSource;
  listeners: Set<Listener>;
  reconnectTimer?: ReturnType<typeof setTimeout>;
};

const connections = new Map<string, Connection>();

function connect(cafeId: string): Connection {
  const existing = connections.get(cafeId);
  if (existing && existing.es.readyState !== EventSource.CLOSED) {
    return existing;
  }

  const listeners = existing?.listeners ?? new Set<Listener>();
  const es = new EventSource(`/api/cafes/${cafeId}/events`);
  const entry: Connection = { es, listeners };
  connections.set(cafeId, entry);

  es.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data) as { type?: string };
      if (data.type === "ping" || data.type === "connected") return;
      listeners.forEach((fn) => fn(data as CafeEvent));
    } catch {
      listeners.forEach((fn) => fn({ type: "order.updated" }));
    }
  };

  es.onerror = () => {
    es.close();
    if (listeners.size === 0) {
      connections.delete(cafeId);
      return;
    }
    clearTimeout(entry.reconnectTimer);
    entry.reconnectTimer = setTimeout(() => {
      if (listeners.size > 0) connect(cafeId);
    }, 3000);
  };

  return entry;
}

export function subscribeCafeEvents(cafeId: string, listener: Listener) {
  const conn = connect(cafeId);
  conn.listeners.add(listener);
  return () => {
    conn.listeners.delete(listener);
    if (conn.listeners.size === 0) {
      clearTimeout(conn.reconnectTimer);
      conn.es.close();
      connections.delete(cafeId);
    }
  };
}
