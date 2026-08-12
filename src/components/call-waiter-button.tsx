"use client";

import { useState } from "react";

export function CallWaiterButton({
  tableId,
  tableNumber,
}: {
  tableId: string;
  tableNumber: number;
}) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleCall() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/tables/${tableId}/call-waiter`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }

      setSent(true);
      setTimeout(() => setSent(false), 10000);
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-24 right-4 z-20">
      <button
        onClick={handleCall}
        disabled={loading || sent}
        className={`flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition ${
          sent
            ? "bg-green-500 text-white"
            : "bg-stone-800 text-white hover:bg-stone-900"
        }`}
      >
        {sent ? "✓ Yuborildi" : loading ? "..." : "🔔 Ofitsiant"}
      </button>
      {error && (
        <p className="mt-1 max-w-[160px] text-right text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
