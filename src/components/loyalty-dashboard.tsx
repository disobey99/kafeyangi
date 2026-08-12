"use client";

import { useEffect, useState } from "react";
import { LoyaltyProgramSettings } from "@/components/loyalty-program-settings";

type Customer = {
  id: string;
  phone: string;
  points: number;
  cashbackSom: number;
  visitCount: number;
  totalSpentSom: number;
};

export function LoyaltyDashboard({ cafeId }: { cafeId: string }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [checkPhone, setCheckPhone] = useState("");
  const [balance, setBalance] = useState<{
    points: number;
    cashbackSom: number;
    canRedeem: boolean;
    canRedeemCashback: boolean;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/cafes/${cafeId}/loyalty`)
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers ?? []));
  }, [cafeId]);

  async function checkBalance() {
    if (!checkPhone.trim()) return;
    const res = await fetch(`/api/cafes/${cafeId}/loyalty?phone=${encodeURIComponent(checkPhone)}`);
    const data = await res.json();
    setBalance({
      points: data.points,
      cashbackSom: data.cashbackSom ?? 0,
      canRedeem: data.canRedeem,
      canRedeemCashback: data.canRedeemCashback ?? false,
    });
  }

  return (
    <div className="space-y-8">
      <LoyaltyProgramSettings cafeId={cafeId} />

      <div className="rounded-xl bg-[var(--dp-accent-soft)] p-4 text-sm text-[var(--dp-text)]">
        <p>
          <strong>Keshbek:</strong> buyurtma summasidan foiz yig&apos;iladi, to&apos;lovda chegirma
          sifatida ishlatiladi (naqd emas). Mijoz telefonini stol buyurtmasida kiritadi yoki
          Telegram bot orqali tekshiradi.
        </p>
        <p className="mt-2">
          <strong>Ball (eski):</strong> har 1000 so&apos;m = 1 ball · 100 ball = 10 000 so&apos;m
          chegirma
        </p>
      </div>

      <div className="rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] p-4 shadow-sm">
        <h3 className="font-semibold text-[var(--dp-text)]">Balans tekshirish</h3>
        <div className="mt-3 flex gap-2">
          <input
            value={checkPhone}
            onChange={(e) => setCheckPhone(e.target.value)}
            placeholder="Telefon (+998...)"
            className="input flex-1 text-sm"
          />
          <button
            type="button"
            onClick={checkBalance}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white"
          >
            Tekshirish
          </button>
        </div>
        {balance && (
          <div className="mt-2 text-sm">
            <p>
              Keshbek: <strong>{balance.cashbackSom.toLocaleString("uz-UZ")} so&apos;m</strong>
              {balance.canRedeemCashback && " — to'lovda ishlatish mumkin"}
            </p>
            <p className="mt-1">
              Ball: <strong>{balance.points}</strong>
              {balance.canRedeem && " — ball chegirmasi mumkin"}
            </p>
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] shadow-sm">
        <table className="w-full text-sm text-[var(--dp-text)]">
          <thead>
            <tr className="border-b border-[var(--dp-border)] text-left text-[var(--dp-muted)]">
              <th className="p-3">Telefon</th>
              <th className="p-3">Keshbek</th>
              <th className="p-3">Ball</th>
              <th className="p-3">Tashrif</th>
              <th className="p-3">Jami xarid</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-3">{c.phone}</td>
                <td className="p-3 font-medium">
                  {c.cashbackSom.toLocaleString("uz-UZ")} so&apos;m
                </td>
                <td className="p-3">{c.points}</td>
                <td className="p-3">{c.visitCount}</td>
                <td className="p-3">{c.totalSpentSom.toLocaleString("uz-UZ")} so&apos;m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
