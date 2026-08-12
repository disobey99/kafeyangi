"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import { debounce } from "@/lib/debounce";

type OrderItem = {
  orderNumber: number;
  status: string;
};

export function DisplayPanel({ cafeId, cafeName }: { cafeId: string; cafeName: string }) {
  const [readyOrders, setReadyOrders] = useState<number[]>([]);
  const [newOrders, setNewOrders] = useState<number[]>([]);

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`/api/orders?cafeId=${cafeId}`);
    const data = await res.json();
    const orders: OrderItem[] = data.orders ?? [];

    setReadyOrders(
      orders
        .filter((o) => o.status === "READY")
        .map((o) => o.orderNumber)
    );

    setNewOrders(
      orders
        .filter((o) => o.status === "PENDING")
        .map((o) => o.orderNumber)
    );
  }, [cafeId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const fetchOrdersRef = useRef(fetchOrders);
  fetchOrdersRef.current = fetchOrders;
  const fetchOrdersDebounced = useRef(debounce(() => fetchOrdersRef.current(), 400));

  useEffect(() => {
    return () => fetchOrdersDebounced.current.cancel();
  }, []);

  useCafeRealtime(cafeId, (event) => {
    if (event.type === "order.created" || event.type === "order.updated") {
      fetchOrdersDebounced.current();
    }
  });

  return (
    <div className="flex min-h-[calc(100vh-80px)] flex-col bg-stone-900 text-white">
      <header className="border-b border-stone-700 px-8 py-6 text-center">
        <h1 className="text-4xl font-bold">{cafeName}</h1>
      </header>

      <main className="grid flex-1 grid-cols-2 divide-x divide-stone-700">
        {/* Tayyor buyurtmalar */}
        <section className="flex flex-col p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-green-400">TAYYOR</h2>
            <p className="mt-2 text-lg text-stone-400">Olib keting</p>
          </div>
          <div className="flex flex-1 flex-wrap content-start justify-center gap-6">
            {readyOrders.length === 0 ? (
              <p className="text-xl text-stone-600">Hozircha yo&apos;q</p>
            ) : (
              readyOrders.map((num) => (
                <OrderBadge key={`ready-${num}`} number={num} variant="ready" />
              ))
            )}
          </div>
        </section>

        {/* Yangi buyurtmalar */}
        <section className="flex flex-col p-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-amber-400">YANGI</h2>
            <p className="mt-2 text-lg text-stone-400">Tayyorlanmoqda</p>
          </div>
          <div className="flex flex-1 flex-wrap content-start justify-center gap-6">
            {newOrders.length === 0 ? (
              <p className="text-xl text-stone-600">Hozircha yo&apos;q</p>
            ) : (
              newOrders.map((num) => (
                <OrderBadge key={`new-${num}`} number={num} variant="new" />
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function OrderBadge({
  number,
  variant,
}: {
  number: number;
  variant: "ready" | "new";
}) {
  const colors =
    variant === "ready"
      ? "bg-green-500 shadow-green-500/30"
      : "bg-amber-500 shadow-amber-500/30 animate-pulse";

  return (
    <div
      className={`flex h-36 w-36 items-center justify-center rounded-3xl text-6xl font-black shadow-lg ${colors}`}
    >
      {String(number).padStart(3, "0")}
    </div>
  );
}
