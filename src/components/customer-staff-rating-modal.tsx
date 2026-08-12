"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Star, X } from "lucide-react";

export function CustomerStaffRatingModal({
  open,
  waiterName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  waiterName: string | null;
  onClose: () => void;
  onSubmit: (score: number, comment: string) => Promise<void>;
}) {
  const [mounted, setMounted] = useState(false);
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setScore(0);
      setHover(0);
      setComment("");
      setLoading(false);
      setDone(false);
    }
  }, [open]);

  if (!open || !mounted) return null;

  async function handleSubmit() {
    if (score < 1) return;
    setLoading(true);
    try {
      await onSubmit(score, comment);
      setDone(true);
      setTimeout(onClose, 2200);
    } finally {
      setLoading(false);
    }
  }

  const panel = (
    <div className="customer-rating-overlay" role="dialog" aria-modal="true" aria-label="Xizmatni baholash">
      <div className="customer-rating-backdrop" aria-hidden />

      {done ? (
        <div className="customer-rating-success">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" strokeWidth={1.75} />
          <p className="mt-4 text-center text-2xl font-bold text-stone-900">Rahmat!</p>
          <p className="mt-2 text-center text-base text-stone-600">Fikringiz qabul qilindi</p>
        </div>
      ) : (
        <div className="customer-rating-card">
          <button type="button" className="customer-rating-close" onClick={onClose} aria-label="Yopish">
            <X className="h-4 w-4" />
          </button>
          <p className="text-center text-lg font-bold text-stone-900">Xizmatni baholang</p>
          <p className="mt-1 text-center text-sm text-stone-500">
            {waiterName ? `${waiterName} xizmati qanday edi?` : "Ofitsiant xizmati qanday edi?"}
          </p>
          <div className="mt-4 flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setScore(n)}
                className="p-1"
                aria-label={`${n} yulduz`}
              >
                <Star
                  className={`h-8 w-8 ${
                    n <= (hover || score) ? "fill-amber-400 text-amber-400" : "text-stone-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Fikr qoldiring (ixtiyoriy)..."
            rows={3}
            className="mt-4 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={score < 1 || loading}
            onClick={() => void handleSubmit()}
            className="mt-4 w-full rounded-xl bg-stone-900 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "Yuborilmoqda..." : "Yuborish"}
          </button>
          <button type="button" onClick={onClose} className="mt-2 w-full text-sm text-stone-500">
            O&apos;tkazib yuborish
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(panel, document.body);
}
