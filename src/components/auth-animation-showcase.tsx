"use client";

import { useEffect, useState } from "react";
import { AuthPosAnimationV1 } from "@/components/auth-pos-animation-v1";
import { AuthFlowAnimation } from "@/components/auth-flow-animation";

type Variant = "flow" | "classic";

const AUTO_MS = 14000;

export function AuthAnimationShowcase() {
  const [variant, setVariant] = useState<Variant>("flow");
  const [manual, setManual] = useState(false);

  useEffect(() => {
    if (manual) return;
    const id = setInterval(() => {
      setVariant((v) => (v === "flow" ? "classic" : "flow"));
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [manual]);

  function pick(next: Variant) {
    setManual(true);
    setVariant(next);
  }

  return (
    <div className="auth-showcase">
      <div className="auth-showcase-switch" role="tablist" aria-label="Animatsiya uslubi">
        <button
          type="button"
          role="tab"
          aria-selected={variant === "flow"}
          className={variant === "flow" ? "auth-showcase-pill-active" : "auth-showcase-pill"}
          onClick={() => pick("flow")}
        >
          Oqim
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={variant === "classic"}
          className={variant === "classic" ? "auth-showcase-pill-active" : "auth-showcase-pill"}
          onClick={() => pick("classic")}
        >
          Kassa
        </button>
      </div>

      <div className="auth-showcase-stage">
        <div
          key={variant}
          className={`auth-showcase-panel ${variant === "flow" ? "auth-showcase-panel-flow" : "auth-showcase-panel-classic"}`}
        >
          {variant === "flow" ? <AuthFlowAnimation /> : <AuthPosAnimationV1 />}
        </div>
      </div>

      {!manual && (
        <p className="auth-showcase-hint">Avtomatik almashadi · bosib uslubni tanlang</p>
      )}
    </div>
  );
}
