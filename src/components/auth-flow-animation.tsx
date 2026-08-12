"use client";

import type { CSSProperties } from "react";
import { ChefHat, QrCode, Receipt, Wallet } from "lucide-react";

const STEPS = [
  { icon: QrCode, label: "QR buyurtma" },
  { icon: Wallet, label: "Kassa" },
  { icon: ChefHat, label: "Oshxona" },
  { icon: Receipt, label: "Chek" },
] as const;

const LINES = [
  { item: "Cappuccino ×2", sum: "56 000" },
  { item: "Osh ×1", sum: "45 000" },
  { item: "Choy ×1", sum: "8 000" },
] as const;

export function AuthFlowAnimation() {
  return (
    <div className="auth-flow" aria-hidden>
      <div className="auth-flow-aurora auth-flow-aurora-a" />
      <div className="auth-flow-aurora auth-flow-aurora-b" />
      <div className="auth-flow-grid" />

      <div className="auth-flow-live">
        <span className="auth-flow-live-dot" />
        Real vaqt sinxron
      </div>

      <div className="auth-flow-pipeline">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="auth-flow-step" style={{ "--i": i } as CSSProperties}>
              <div className="auth-flow-node">
                <Icon className="auth-flow-node-icon" strokeWidth={2} />
                <span className="auth-flow-node-ring" />
              </div>
              <span className="auth-flow-step-label">{step.label}</span>
              {i < STEPS.length - 1 && <span className="auth-flow-connector" />}
            </div>
          );
        })}
      </div>

      <div className="auth-flow-stage">
        <div className="auth-flow-printer">
          <div className="auth-flow-printer-face">
            <span />
            <span />
            <span />
          </div>
          <div className="auth-flow-printer-mouth" />
        </div>

        <div className="auth-flow-paper-wrap">
          <div className="auth-flow-paper">
            <p className="auth-flow-paper-title">DEMO KAFE</p>
            <p className="auth-flow-paper-sub">Stol 4 · #127</p>
            <div className="auth-flow-paper-rule" />
            {LINES.map((line) => (
              <div key={line.item} className="auth-flow-paper-line">
                <span>{line.item}</span>
                <span>{line.sum}</span>
              </div>
            ))}
            <div className="auth-flow-paper-rule auth-flow-paper-rule-dash" />
            <div className="auth-flow-paper-total">
              <span>JAMI</span>
              <span>109 000</span>
            </div>
            <div className="auth-flow-stamp">TO&apos;LANDI</div>
          </div>
        </div>
      </div>

      <div className="auth-flow-stats">
        <div className="auth-flow-stat">
          <span className="auth-flow-stat-num">47</span>
          <span className="auth-flow-stat-lbl">buyurtma</span>
        </div>
        <div className="auth-flow-stat auth-flow-stat-main">
          <span className="auth-flow-stat-num">2.4M</span>
          <span className="auth-flow-stat-lbl">bugun so&apos;m</span>
        </div>
        <div className="auth-flow-stat">
          <span className="auth-flow-stat-num">12</span>
          <span className="auth-flow-stat-lbl">stol band</span>
        </div>
      </div>
    </div>
  );
}
