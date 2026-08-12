"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShoppingBag, Star, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ProductMenuImage } from "@/components/product-menu-image";

type Review = {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
};

export function ProductDetailSheet({
  product,
  accent = "#2AC1BC",
  localeName,
  localeDescription,
  onClose,
  onAdd,
  blocked,
}: {
  product: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    menuTag?: string | null;
    isAvailable: boolean;
  };
  accent?: string;
  localeName: string;
  localeDescription: string | null;
  onClose: () => void;
  onAdd: () => void;
  blocked?: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.daModal = "1";
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.daModal;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/products/${product.id}/reviews`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setReviews(d.reviews ?? []);
        setAvgScore(d.avgScore ?? null);
        setCount(d.count ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [product.id]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[20000] flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={localeName}
        className="relative flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[32px] bg-white/95 shadow-2xl ring-1 ring-white/80 backdrop-blur-xl sm:rounded-[32px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex shrink-0 flex-col items-center px-4 pb-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="absolute left-4 top-4 z-[1] flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm ring-1 ring-stone-100"
            aria-label="Orqaga"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="mt-2 h-[200px] w-[200px] overflow-hidden rounded-full bg-stone-100 shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-4 ring-white">
            <ProductMenuImage
              url={product.imageUrl}
              name={localeName}
              menuTag={product.menuTag}
              size="card"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[22px] font-extrabold leading-tight text-stone-900">
              {localeName}
            </h2>
            <p className="shrink-0 text-xl font-black text-stone-900">
              {formatPrice(product.price)}
            </p>
          </div>

          {avgScore != null ? (
            <p className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-amber-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {avgScore}
              <span className="font-medium text-stone-400">({count})</span>
            </p>
          ) : null}

          {localeDescription ? (
            <div className="mt-4">
              <h3 className="text-sm font-extrabold text-stone-900">Tafsilot</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                {localeDescription}
              </p>
            </div>
          ) : null}

          <div className="mt-5 border-t border-stone-100/80 pt-4">
            <h3 className="text-sm font-extrabold text-stone-900">Fikrlar</h3>
            {loading ? (
              <p className="mt-3 text-sm text-stone-400">Yuklanmoqda…</p>
            ) : reviews.length === 0 ? (
              <p className="mt-3 text-sm text-stone-400">
                Hali fikr yo&apos;q — birinchi bo&apos;lib baholang
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {reviews.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl bg-white/70 px-3 py-2.5 ring-1 ring-stone-100"
                  >
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < r.score
                              ? "fill-amber-400 text-amber-400"
                              : "text-stone-300"
                          }`}
                        />
                      ))}
                    </div>
                    {r.comment ? (
                      <p className="mt-1.5 text-sm leading-snug text-stone-700">
                        {r.comment}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-stone-400">Baholandi</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex shrink-0 justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2">
          <button
            type="button"
            disabled={!product.isAvailable || blocked}
            onClick={onAdd}
            className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_12px_32px_rgba(42,193,188,0.45)] disabled:opacity-50"
            style={{ background: accent }}
            aria-label={
              !product.isAvailable ? "Mavjud emas" : "Savatga qo'shish"
            }
          >
            <ShoppingBag className="h-7 w-7" strokeWidth={2.3} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
