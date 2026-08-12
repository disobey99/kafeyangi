"use client";

import { useEffect, useId, useState } from "react";
import {
  Bike,
  Check,
  ChefHat,
  CookingPot,
  Flame,
  Package,
  Send,
  ShoppingBag,
  X,
} from "lucide-react";

export type OrderAnimPhase =
  | "placed"
  | "accepted"
  | "preparing"
  | "awaiting_courier"
  | "delivering"
  | "ready"
  | "done"
  | "cancelled";

export function resolveOrderAnimPhase(
  status: string,
  orderType?: string | null,
  courierClaimed?: boolean,
): OrderAnimPhase {
  if (status === "PENDING") return "placed";
  if (status === "CONFIRMED") return "accepted";
  if (status === "PREPARING") return "preparing";
  if (status === "CANCELLED") return "cancelled";
  if (status === "DELIVERED") return "done";
  if (status === "READY") {
    if (orderType === "DELIVERY") {
      return courierClaimed ? "delivering" : "awaiting_courier";
    }
    return "ready";
  }
  return "placed";
}

const PHASE_COPY: Record<
  OrderAnimPhase,
  { title: string; subtitle: string }
> = {
  placed: {
    title: "Buyurtma yuborildi",
    subtitle: "Kassa tasdiqlashini kutmoqda…",
  },
  accepted: {
    title: "Qabul qilindi!",
    subtitle: "Oshxonaga yuborildi…",
  },
  preparing: {
    title: "Tayyorlanmoqda",
    subtitle: "Oshpaz taomingizni pishirmoqda…",
  },
  awaiting_courier: {
    title: "Tayyor!",
    subtitle: "Yetkazuvchi buyurtmani olishi kutilmoqda…",
  },
  delivering: {
    title: "Yo'lda",
    subtitle: "Yetkazib beruvchi siz tomonga ketmoqda",
  },
  ready: {
    title: "Tayyor!",
    subtitle: "Buyurtmani olib ketishingiz mumkin",
  },
  done: {
    title: "Yetkazildi",
    subtitle: "Yoqimli ishtaha!",
  },
  cancelled: {
    title: "Bekor qilindi",
    subtitle: "Buyurtma kassa tomonidan bekor qilindi",
  },
};

export function OrderStatusAnimation({
  phase,
  accent = "#2AC1BC",
  onViewReceipt,
}: {
  phase: OrderAnimPhase;
  accent?: string;
  onViewReceipt?: () => void;
}) {
  const uid = useId().replace(/:/g, "");
  const [mountKey, setMountKey] = useState(0);

  useEffect(() => {
    setMountKey((n) => n + 1);
  }, [phase]);

  const copy = PHASE_COPY[phase];
  const bounce = `oa-bounce-${uid}`;
  const pulse = `oa-pulse-${uid}`;
  const scaleIn = `oa-scale-${uid}`;
  const ride = `oa-ride-${uid}`;
  const sparkle = `oa-spark-${uid}`;
  const float3d = `oa-float3d-${uid}`;
  const steam1 = `oa-steam1-${uid}`;
  const steam2 = `oa-steam2-${uid}`;
  const steam3 = `oa-steam3-${uid}`;
  const flame = `oa-flame-${uid}`;
  const stir = `oa-stir-${uid}`;
  const bubble = `oa-bubble-${uid}`;
  const potBob = `oa-potbob-${uid}`;
  const waitDot = `oa-waitdot-${uid}`;
  const bikePeek = `oa-bikepeek-${uid}`;
  const bagGlow = `oa-bagglow-${uid}`;
  const dashMove = `oa-dash-${uid}`;

  return (
    <div
      key={`${phase}-${mountKey}`}
      className="oa-status-hero flex flex-col items-center px-4 pb-4 pt-5"
      style={{
        background: `linear-gradient(180deg, ${accent}33 0%, var(--da-card, #ffffff) 72%)`,
      }}
    >
      <style>{`
        @keyframes ${bounce} {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes ${pulse} {
          0% { transform: scale(0.55); opacity: 0.55; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(1.35); opacity: 0; }
        }
        @keyframes ${scaleIn} {
          0% { transform: scale(0.2); opacity: 0; }
          60% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes ${ride} {
          0% { transform: translateX(0); }
          50% { transform: translateX(7.5rem); }
          100% { transform: translateX(0); }
        }
        @keyframes ${sparkle} {
          0%, 100% { transform: scale(0.6); opacity: 0.35; }
          50% { transform: scale(1.25); opacity: 1; }
        }
        @keyframes ${float3d} {
          0%, 100% { transform: rotateX(18deg) rotateY(-22deg) translateY(0); }
          50% { transform: rotateX(18deg) rotateY(-22deg) translateY(-8px); }
        }
        @keyframes ${steam1} {
          0% { transform: translateY(8px) scale(0.6); opacity: 0; }
          25% { opacity: 0.7; }
          100% { transform: translateY(-48px) scale(1.15); opacity: 0; }
        }
        @keyframes ${steam2} {
          0% { transform: translateY(10px) scale(0.5); opacity: 0; }
          30% { opacity: 0.65; }
          100% { transform: translateY(-56px) scale(1.2); opacity: 0; }
        }
        @keyframes ${steam3} {
          0% { transform: translateY(6px) scale(0.55); opacity: 0; }
          20% { opacity: 0.55; }
          100% { transform: translateY(-42px) scale(1.1); opacity: 0; }
        }
        @keyframes ${flame} {
          0%, 100% { transform: scaleY(1) scaleX(1); opacity: 0.85; }
          40% { transform: scaleY(1.2) scaleX(0.88); opacity: 1; }
          70% { transform: scaleY(0.9) scaleX(1.08); opacity: 0.75; }
        }
        @keyframes ${stir} {
          0%, 100% { transform: rotate(-18deg) translateY(0); }
          50% { transform: rotate(22deg) translateY(2px); }
        }
        @keyframes ${bubble} {
          0% { transform: translateY(0) scale(0.4); opacity: 0; }
          40% { opacity: 0.9; }
          100% { transform: translateY(-18px) scale(1); opacity: 0; }
        }
        @keyframes ${potBob} {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-3px) rotate(-1.5deg); }
        }
        @keyframes ${waitDot} {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-4px); }
        }
        @keyframes ${bikePeek} {
          0%, 100% { transform: translateX(0); opacity: 0.45; }
          50% { transform: translateX(10px); opacity: 0.85; }
        }
        @keyframes ${bagGlow} {
          0%, 100% { box-shadow: 0 8px 20px rgba(28,25,23,0.12); }
          50% { box-shadow: 0 10px 28px ${accent}66; }
        }
        @keyframes ${dashMove} {
          0% { background-position: 0 0; }
          100% { background-position: 24px 0; }
        }
      `}</style>

      <div
        className="relative flex h-44 w-full max-w-[18rem] items-center justify-center overflow-hidden rounded-2xl"
        style={
          phase === "cancelled"
            ? {
                background:
                  "linear-gradient(180deg, color-mix(in srgb, #ef4444 22%, var(--da-card, #fff)) 0%, var(--da-card, #ffffff) 72%)",
              }
            : {
                background:
                  "color-mix(in srgb, var(--da-ink, #1c1917) 6%, var(--da-card, #ffffff))",
              }
        }
      >
        {phase === "placed" && (
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              className="absolute h-32 w-32 rounded-full"
              style={{
                background: accent,
                animation: `${pulse} 1.4s ease-out infinite`,
              }}
            />
            <div
              className="relative z-[1] flex h-24 w-24 items-center justify-center rounded-3xl text-white shadow-xl"
              style={{
                background: accent,
                animation: `${bounce} 1.1s ease-in-out infinite`,
              }}
            >
              <Send className="h-11 w-11" strokeWidth={2.5} />
            </div>
            <Package
              className="absolute bottom-5 right-7 h-10 w-10 text-amber-500"
              strokeWidth={2.4}
              style={{ animation: `${bounce} 1.4s ease-in-out infinite 0.2s` }}
            />
          </div>
        )}

        {phase === "accepted" && (
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              className="absolute h-36 w-36 rounded-full"
              style={{
                background: accent,
                opacity: 0.35,
                animation: `${pulse} 1.15s ease-out infinite`,
              }}
            />
            <div
              className="relative z-[1] flex h-28 w-28 items-center justify-center rounded-full text-white shadow-2xl"
              style={{
                background: accent,
                animation: `${scaleIn} 0.7s cubic-bezier(0.2, 1.5, 0.4, 1) both`,
              }}
            >
              <Check className="h-14 w-14" strokeWidth={3.2} />
            </div>
          </div>
        )}

        {phase === "preparing" && (
          <div className="relative flex h-full w-full flex-col items-center justify-end pb-5">
            {/* Warm kitchen glow */}
            <div
              className="absolute inset-x-8 bottom-6 h-24 rounded-full blur-2xl"
              style={{
                background:
                  "radial-gradient(circle, rgba(251,146,60,0.45) 0%, transparent 70%)",
              }}
            />

            {/* Chef hat */}
            <div
              className="absolute left-6 top-4 text-stone-700"
              style={{ animation: `${bounce} 2s ease-in-out infinite` }}
            >
              <ChefHat className="h-9 w-9" strokeWidth={2.2} />
            </div>

            {/* Steam */}
            <div className="absolute bottom-[5.5rem] left-1/2 z-[2] flex -translate-x-1/2 gap-3">
              <span
                className="block h-8 w-2.5 rounded-full bg-stone-300/80"
                style={{ animation: `${steam1} 2.2s ease-out infinite` }}
              />
              <span
                className="block h-10 w-3 rounded-full bg-stone-300/90"
                style={{ animation: `${steam2} 2.4s ease-out infinite 0.35s` }}
              />
              <span
                className="block h-7 w-2 rounded-full bg-stone-300/70"
                style={{ animation: `${steam3} 2s ease-out infinite 0.7s` }}
              />
            </div>

            {/* Bubbles in pot */}
            <div className="absolute bottom-[4.6rem] left-1/2 z-[2] flex -translate-x-1/2 gap-2">
              <span
                className="h-2 w-2 rounded-full bg-amber-200"
                style={{ animation: `${bubble} 1.4s ease-out infinite` }}
              />
              <span
                className="h-1.5 w-1.5 rounded-full bg-orange-200"
                style={{ animation: `${bubble} 1.4s ease-out infinite 0.45s` }}
              />
              <span
                className="h-2 w-2 rounded-full bg-amber-100"
                style={{ animation: `${bubble} 1.4s ease-out infinite 0.85s` }}
              />
            </div>

            {/* Stirring ladle */}
            <div
              className="absolute bottom-[5.75rem] right-[4.5rem] z-[3] origin-bottom"
              style={{ animation: `${stir} 1.15s ease-in-out infinite` }}
            >
              <div
                className="h-14 w-1.5 rounded-full"
                style={{ background: "#a8a29e" }}
              />
              <div
                className="absolute -bottom-1 -left-1.5 h-4 w-5 rounded-full"
                style={{ background: accent }}
              />
            </div>

            {/* Cooking pot */}
            <div
              className="relative z-[1] flex flex-col items-center"
              style={{ animation: `${potBob} 1.6s ease-in-out infinite` }}
            >
              <div
                className="mb-0.5 flex h-16 w-20 items-center justify-center rounded-2xl text-white shadow-xl"
                style={{
                  background: `linear-gradient(160deg, ${accent} 0%, #0f766e 100%)`,
                  boxShadow: "0 10px 24px rgba(28,25,23,0.18)",
                }}
              >
                <CookingPot className="h-9 w-9" strokeWidth={2.2} />
              </div>
              {/* Stove / flame */}
              <div className="relative -mt-1 flex items-end justify-center gap-0.5">
                <Flame
                  className="h-5 w-5 text-orange-500"
                  strokeWidth={2.4}
                  fill="currentColor"
                  style={{
                    animation: `${flame} 0.55s ease-in-out infinite`,
                    color: "#f97316",
                  }}
                />
                <Flame
                  className="h-6 w-6 text-amber-400"
                  strokeWidth={2.4}
                  fill="currentColor"
                  style={{
                    animation: `${flame} 0.55s ease-in-out infinite 0.12s`,
                    color: "#fbbf24",
                  }}
                />
                <Flame
                  className="h-5 w-5 text-orange-500"
                  strokeWidth={2.4}
                  fill="currentColor"
                  style={{
                    animation: `${flame} 0.55s ease-in-out infinite 0.24s`,
                    color: "#ea580c",
                  }}
                />
              </div>
              <div
                className="mt-1 h-1.5 w-16 rounded-full"
                style={{ background: "#57534e" }}
              />
            </div>
          </div>
        )}

        {phase === "awaiting_courier" && (
          <div className="relative flex h-full w-full items-center justify-center px-3">
            {/* Ready bag on cafe side */}
            <div className="relative z-[2] flex flex-col items-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-2xl text-white"
                style={{
                  background: `linear-gradient(160deg, ${accent} 0%, #0f766e 100%)`,
                  animation: `${bagGlow} 1.8s ease-in-out infinite, ${bounce} 2s ease-in-out infinite`,
                }}
              >
                <Package className="h-10 w-10" strokeWidth={2.3} />
              </div>
              <div className="mt-2 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: accent,
                      animation: `${waitDot} 1.2s ease-in-out infinite ${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Dashed waiting path */}
            <div
              className="absolute inset-x-10 bottom-12 h-0.5"
              style={{
                backgroundImage: `repeating-linear-gradient(90deg, ${accent}99 0 6px, transparent 6px 12px)`,
                backgroundSize: "24px 2px",
                animation: `${dashMove} 0.8s linear infinite`,
              }}
            />

            {/* Courier still approaching / not claimed yet */}
            <div
              className="absolute bottom-7 right-5 flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-stone-500"
              style={{ animation: `${bikePeek} 1.6s ease-in-out infinite` }}
            >
              <Bike className="h-7 w-7" strokeWidth={2.3} />
            </div>
          </div>
        )}

        {phase === "delivering" && (
          <div className="relative h-full w-full overflow-hidden px-4">
            <div className="absolute inset-x-8 bottom-14 h-1.5 rounded-full bg-stone-200" />
            <div
              className="absolute bottom-9 left-4 flex items-end gap-2"
              style={{ animation: `${ride} 2s ease-in-out infinite` }}
            >
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-xl"
                style={{ background: accent }}
              >
                <Bike className="h-9 w-9" strokeWidth={2.4} />
              </div>
              <div
                className="mb-1 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400 text-white shadow-md"
                style={{ animation: `${bounce} 0.9s ease-in-out infinite` }}
              >
                <Package className="h-6 w-6" strokeWidth={2.4} />
              </div>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-[2rem] text-white shadow-2xl"
              style={{
                background: accent,
                animation: `${bounce} 1s ease-in-out infinite`,
              }}
            >
              <ShoppingBag className="h-12 w-12" strokeWidth={2.3} />
            </div>
            <span
              className="absolute left-8 top-6 text-3xl text-amber-400"
              style={{ animation: `${sparkle} 1s ease-in-out infinite` }}
            >
              ✦
            </span>
            <span
              className="absolute right-10 top-10 text-2xl text-amber-400"
              style={{ animation: `${sparkle} 1s ease-in-out infinite 0.35s` }}
            >
              ✦
            </span>
          </div>
        )}

        {phase === "done" && (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ perspective: "420px" }}
          >
            <div
              className="relative h-24 w-28"
              style={{
                transformStyle: "preserve-3d",
                animation: `${float3d} 2.4s ease-in-out infinite`,
              }}
            >
              <div
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `linear-gradient(145deg, ${accent} 0%, #128f8a 100%)`,
                  boxShadow:
                    "8px 14px 28px rgba(28,25,23,0.22), inset 0 1px 0 rgba(255,255,255,0.35)",
                  transform: "translateZ(18px)",
                }}
              />
              <div
                className="absolute left-0 top-0 h-full w-4 rounded-l-xl"
                style={{
                  background: "linear-gradient(180deg, #0f766e, #115e59)",
                  transform: "rotateY(-90deg) translateZ(2px)",
                  transformOrigin: "left center",
                }}
              />
              <div
                className="absolute left-0 top-0 h-4 w-full rounded-t-xl"
                style={{
                  background: "linear-gradient(90deg, #5eead4, #2dd4bf)",
                  transform: "rotateX(90deg) translateZ(2px)",
                  transformOrigin: "top center",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Check
                  className="h-10 w-10 text-white drop-shadow"
                  strokeWidth={3}
                  style={{ transform: "translateZ(22px)" }}
                />
              </div>
              <div
                className="absolute left-1/2 top-0 h-full w-1.5 -translate-x-1/2"
                style={{
                  background: "rgba(255,255,255,0.45)",
                  transform: "translateZ(19px)",
                }}
              />
            </div>
          </div>
        )}

        {phase === "cancelled" && (
          <div className="relative flex h-full w-full items-center justify-center">
            <div
              className="absolute h-36 w-36 rounded-full bg-red-200/50"
              style={{ animation: `${pulse} 1.4s ease-out infinite` }}
            />
            <div
              className="relative z-[1] flex h-28 w-28 items-center justify-center rounded-full bg-red-500 text-white shadow-2xl"
              style={{
                animation: `${scaleIn} 0.7s cubic-bezier(0.2, 1.5, 0.4, 1) both`,
              }}
            >
              <X className="h-14 w-14" strokeWidth={3.2} />
            </div>
          </div>
        )}
      </div>

      <p
        className="mt-3 text-center text-lg font-extrabold"
        style={{ color: "var(--da-ink, #1c1917)" }}
      >
        {copy.title}
      </p>
      <p
        className="mt-1 text-center text-sm font-medium"
        style={{ color: "var(--da-muted, #78716c)" }}
      >
        {copy.subtitle}
      </p>

      {phase === "done" && onViewReceipt ? (
        <button
          type="button"
          onClick={onViewReceipt}
          className="mt-3 rounded-full px-5 py-2.5 text-sm font-extrabold text-white shadow-md"
          style={{ background: accent }}
        >
          Chek tafsiloti
        </button>
      ) : null}
    </div>
  );
}
