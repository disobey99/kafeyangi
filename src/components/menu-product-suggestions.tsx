"use client";

import { useEffect, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";

type Suggestion = {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  reason: string;
};

export function MenuProductSuggestions({
  cafeId,
  productId,
  onAdd,
  onDismiss,
}: {
  cafeId: string;
  productId: string | null;
  onAdd: (productId: string) => void;
  onDismiss: () => void;
}) {
  const [items, setItems] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (!productId) {
      setItems([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/cafes/${cafeId}/pairings?productId=${encodeURIComponent(productId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setItems(data.suggestions ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [cafeId, productId]);

  if (!productId || items.length === 0) return null;

  return (
    <div className="menu-pairing-toast" role="status">
      <div className="menu-pairing-toast-head">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span className="font-bold text-stone-900">Tavsiya</span>
        <button type="button" onClick={onDismiss} className="ml-auto text-stone-400" aria-label="Yopish">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="menu-pairing-toast-list">
        {items.map((item) => (
          <div key={item.productId} className="menu-pairing-item">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-stone-900">{item.name}</p>
              <p className="text-xs text-stone-500">{item.reason}</p>
              <p className="text-xs font-bold text-amber-700">{formatPrice(item.price)}</p>
            </div>
            <button
              type="button"
              onClick={() => onAdd(item.productId)}
              className="menu-pairing-add"
              aria-label={`${item.name} qo'shish`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
