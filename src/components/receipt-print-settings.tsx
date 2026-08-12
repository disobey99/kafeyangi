"use client";

import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getAutoPrintCashier,
  getAutoPrintKitchen,
  setAutoPrintCashier,
  setAutoPrintKitchen,
} from "@/lib/receipt-print";

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div
      className="flex min-w-0 items-center justify-between gap-3 overflow-hidden rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--dp-border)", background: "var(--dp-card)" }}
    >
      <div className="min-w-0 flex-1 pr-1">
        <p className="text-sm font-semibold text-[var(--dp-text)]">{label}</p>
        <p className="text-[11px] leading-snug text-[var(--dp-muted)]">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors duration-200 ${
          checked ? "bg-[var(--dp-accent)]" : "bg-[var(--dp-border)]"
        }`}
      >
        <span
          className={`pointer-events-none absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function ReceiptPrintSettings() {
  const [kitchen, setKitchen] = useState(true);
  const [cashier, setCashier] = useState(true);

  useEffect(() => {
    setKitchen(getAutoPrintKitchen());
    setCashier(getAutoPrintCashier());
  }, []);

  return (
    <div
      className="min-w-0 overflow-hidden rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: "var(--dp-border)", background: "var(--dp-input-bg)" }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Printer className="h-4 w-4 text-[var(--dp-accent)]" />
        <p className="text-sm font-bold text-[var(--dp-text)]">Avto chop sozlamalari</p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <Toggle
          checked={kitchen}
          onChange={(on) => {
            setKitchen(on);
            setAutoPrintKitchen(on);
          }}
          label="Oshxona avto chop"
          hint={
            kitchen
              ? "Oshxona panelida yangi CONFIRMED chek. Offline qabulda kassada chiqmaydi"
              : "Avto chop o'chirilgan — qo'lda «Chop» tugmasi"
          }
        />
        <Toggle
          checked={cashier}
          onChange={(on) => {
            setCashier(on);
            setAutoPrintCashier(on);
          }}
          label="Kassa avto chop"
          hint={
            cashier
              ? "Stol yopishda kassa cheki chiqadi"
              : "Stol yopishda chek chiqmaydi"
          }
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--dp-muted)]">
        Brauzer birinchi marta printer tanlash oynasini ko&apos;rsatishi mumkin. Keyingi
        safarlarda tezroq ishlaydi. Ko&apos;p buyurtmada «Barchasini qabul qilish» bitta
        chop oynasida barcha oshxona cheklarini beradi.
      </p>
    </div>
  );
}
