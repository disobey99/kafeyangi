"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { pickLocalizedName, type MenuLocale } from "@/lib/menu-i18n";
import { getMenuUiLabels } from "@/lib/menu-ui-labels";
import { mustPickModifiersBeforeAdd } from "@/lib/modifiers";

export type ModifierGroup = {
  id: string;
  name: string;
  nameRu?: string | null;
  nameEn?: string | null;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: {
    id: string;
    name: string;
    nameRu?: string | null;
    nameEn?: string | null;
    priceDelta: number;
  }[];
};

export function ProductModifierPicker({
  productName,
  basePrice,
  groups,
  locale = "uz",
  onConfirm,
  onCancel,
}: {
  productName: string;
  basePrice: number;
  groups: ModifierGroup[];
  locale?: MenuLocale;
  onConfirm: (optionIds: string[], totalUnitPrice: number, summary: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  const ui = getMenuUiLabels(locale);
  const canOrderBase = !mustPickModifiersBeforeAdd(groups);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSelected(new Set());
    setError("");
  }, [productName]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.dataset.daModal = "1";
    return () => {
      document.body.style.overflow = prev;
      delete document.body.dataset.daModal;
    };
  }, []);

  function toggle(group: ModifierGroup, optionId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      const inGroup = group.options.filter((o) => next.has(o.id));
      if (next.has(optionId)) {
        next.delete(optionId);
        return next;
      }
      if (group.maxSelect === 1) {
        for (const o of group.options) next.delete(o.id);
        next.add(optionId);
        return next;
      }
      if (inGroup.length >= group.maxSelect) return prev;
      next.add(optionId);
      return next;
    });
  }

  function handleConfirm() {
    for (const g of groups) {
      const count = g.options.filter((o) => selected.has(o.id)).length;
      if (g.required && count === 0) {
        setError(ui.selectGroup(pickLocalizedName(g, locale)));
        return;
      }
      if (count < g.minSelect && (g.required || g.minSelect > 0)) {
        setError(ui.minSelect(g.minSelect));
        return;
      }
    }
    let extra = 0;
    const labels: string[] = [];
    for (const g of groups) {
      for (const o of g.options) {
        if (selected.has(o.id)) {
          extra += o.priceDelta;
          labels.push(pickLocalizedName(o, locale));
        }
      }
    }
    onConfirm([...selected], basePrice + extra, labels.join(", "));
  }

  const extra = groups
    .flatMap((g) => g.options)
    .filter((o) => selected.has(o.id))
    .reduce((s, o) => s + o.priceDelta, 0);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[20000] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={productName}
        className="customer-menu-modal flex max-h-[min(88dvh,40rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-stone-100 px-5 pb-3 pt-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-stone-900">{productName}</h3>
            <p className="text-sm font-semibold text-stone-600">
              {formatPrice(basePrice + extra)}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-stone-100 text-stone-700"
            aria-label={ui.cancel}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {canOrderBase && (
            <button
              type="button"
              onClick={() => onConfirm([], basePrice, "")}
              className="flex w-full items-center justify-between rounded-xl border-2 border-amber-500 bg-amber-50 px-3 py-3 text-left text-sm font-semibold text-stone-900"
            >
              <span>{ui.addStandard}</span>
              <span className="text-amber-800">{formatPrice(basePrice)}</span>
            </button>
          )}

          <div className={`space-y-4 ${canOrderBase ? "mt-4" : ""}`}>
            {groups.map((group) => (
              <div key={group.id}>
                <p className="text-sm font-semibold text-stone-900">
                  {pickLocalizedName(group, locale)}
                  {group.required ? (
                    <span className="text-red-600"> *</span>
                  ) : (
                    <span className="ml-1 text-xs font-normal text-stone-500">
                      ({ui.modifiersOptional})
                    </span>
                  )}
                </p>
                <div className="mt-2 space-y-1">
                  {group.options.map((opt) => {
                    const on = selected.has(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => toggle(group, opt.id)}
                        className={`customer-menu-option ${on ? "is-selected" : ""}`}
                      >
                        <span>{pickLocalizedName(opt, locale)}</span>
                        {opt.priceDelta > 0 && (
                          <span className="customer-menu-option-price">
                            +{formatPrice(opt.priceDelta)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        </div>

        <div className="shrink-0 border-t border-stone-200 bg-white px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="customer-menu-btn-cancel min-h-12 flex-1"
            >
              {ui.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="customer-menu-btn-confirm min-h-12 flex-[1.4]"
            >
              {ui.add}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
