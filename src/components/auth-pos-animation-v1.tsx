"use client";

import { useEffect, useState } from "react";

const RECEIPT_LINES = [
  { name: "Cappuccino", qty: 2, price: "56 000" },
  { name: "Osh", qty: 1, price: "45 000" },
  { name: "Ko'k choy", qty: 1, price: "8 000" },
] as const;

const TOTAL = "109 000";
const CYCLE_MS = 9000;

export function AuthPosAnimationV1() {
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), CYCLE_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="auth-pos-scene" aria-hidden key={cycle}>
      <div className="auth-pos-glow" />

      <div className="auth-pos-terminal">
        <div className="auth-pos-terminal-top">
          <span className="auth-pos-dot" />
          <span className="auth-pos-dot" />
          <span className="auth-pos-dot auth-pos-dot-live" />
          <span className="auth-pos-terminal-label">Kassa #01</span>
        </div>
        <div className="auth-pos-screen">
          <p className="auth-pos-screen-title">Yangi buyurtma</p>
          {RECEIPT_LINES.map((line, i) => (
            <div
              key={line.name}
              className="auth-pos-screen-row"
              style={{ animationDelay: `${0.4 + i * 0.55}s` }}
            >
              <span>
                {line.name} ×{line.qty}
              </span>
              <span>{line.price}</span>
            </div>
          ))}
          <div className="auth-pos-screen-total" style={{ animationDelay: "2.1s" }}>
            <span>Jami</span>
            <span>{TOTAL} so&apos;m</span>
          </div>
        </div>
        <div className="auth-pos-slot" />
      </div>

      <div className="auth-pos-receipt">
        <div className="auth-pos-receipt-teeth" />
        <p className="auth-pos-receipt-brand">Nookline · Chek</p>
        <p className="auth-pos-receipt-meta">Stol 4 · #{String(127).padStart(3, "0")}</p>
        <div className="auth-pos-receipt-divider" />
        {RECEIPT_LINES.map((line, i) => (
          <div
            key={`r-${line.name}`}
            className="auth-pos-receipt-row"
            style={{ animationDelay: `${2.6 + i * 0.4}s` }}
          >
            <span>
              {line.name} ×{line.qty}
            </span>
            <span>{line.price}</span>
          </div>
        ))}
        <div className="auth-pos-receipt-divider auth-pos-receipt-divider-dashed" />
        <div className="auth-pos-receipt-total" style={{ animationDelay: "4.2s" }}>
          <span>JAMI</span>
          <span>{TOTAL} so&apos;m</span>
        </div>
        <p className="auth-pos-receipt-paid" style={{ animationDelay: "4.8s" }}>
          ✓ To&apos;landi
        </p>
        <div className="auth-pos-receipt-barcode" style={{ animationDelay: "5.1s" }}>
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} style={{ height: `${40 + ((i * 7) % 60)}%` }} />
          ))}
        </div>
      </div>

      <div className="auth-pos-calc">
        <span className="auth-pos-calc-key">+</span>
        <span className="auth-pos-calc-key auth-pos-calc-key-accent">=</span>
        <span className="auth-pos-calc-display">{TOTAL}</span>
      </div>
    </div>
  );
}
