"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, Plus, Search, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  MENU_FOOD_TAGS,
  getMenuFoodTag,
  menuFoodTagLabel,
  type MenuFoodTagId,
} from "@/lib/menu-food-tags";
import type { MenuTemplateItem } from "@/lib/menu-template-catalog";
import { listMenuTemplates } from "@/lib/menu-template-catalog";

type CategoryOption = { id: string; name: string };

export function MenuTemplatePicker({
  cafeId,
  categories,
  onClose,
}: {
  cafeId: string;
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<MenuFoodTagId | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [overrides, setOverrides] = useState<
    Record<string, { name: string; priceSom: string; categoryId: string }>
  >({});
  const tagScrollRef = useRef<HTMLDivElement>(null);
  const tagDragRef = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  function onTagWheel(e: React.WheelEvent<HTMLDivElement>) {
    const el = tagScrollRef.current;
    if (!el || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
  }

  function onTagPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    const el = tagScrollRef.current;
    if (!el) return;
    tagDragRef.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
    el.classList.add("is-dragging");
  }

  function onTagPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = tagScrollRef.current;
    const drag = tagDragRef.current;
    if (!el || !drag.active) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 4) drag.moved = true;
    el.scrollLeft = drag.startScroll - dx;
  }

  function endTagDrag(e: React.PointerEvent<HTMLDivElement>) {
    const el = tagScrollRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    el?.classList.remove("is-dragging");
    tagDragRef.current.active = false;
    window.setTimeout(() => {
      tagDragRef.current.moved = false;
    }, 0);
  }

  function pickTag(tag: MenuFoodTagId | null) {
    if (tagDragRef.current.moved) return;
    setActiveTag((prev) => (prev === tag ? null : tag));
  }

  const templates = useMemo(
    () => listMenuTemplates(activeTag ?? undefined, search),
    [activeTag, search],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected],
  );

  function toggle(id: string, template: MenuTemplateItem) {
    setSelected((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id] && !overrides[id]) {
        const matchCat = categories.find(
          (c) => c.name.toLowerCase() === template.categoryHint.toLowerCase(),
        );
        setOverrides((o) => ({
          ...o,
          [id]: {
            name: template.name,
            priceSom: String(template.suggestedPriceSom),
            categoryId: matchCat?.id ?? "",
          },
        }));
      }
      return next;
    });
  }

  async function handleImport() {
    if (selectedIds.length === 0) return;
    setImporting(true);
    setError("");
    try {
      const items = selectedIds.map((templateId) => {
        const o = overrides[templateId];
        const priceSom = parseInt(String(o?.priceSom ?? "").replace(/\s/g, ""), 10);
        const name = o?.name?.trim();
        return {
          templateId,
          name: name || undefined,
          categoryId: o?.categoryId || undefined,
          priceSom: Number.isFinite(priceSom) && priceSom >= 100 ? priceSom : undefined,
        };
      });

      const res = await fetch(`/api/cafes/${cafeId}/products/import-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import xatosi");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setImporting(false);
    }
  }

  if (!mounted) return null;

  const panel = (
    <div
      className="menu-tpl-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-template-title"
      onClick={onClose}
    >
      <div className="menu-tpl-panel" onClick={(e) => e.stopPropagation()}>
        <header className="menu-tpl-head">
          <div>
            <p className="menu-tpl-kicker">Tayyor bazadan</p>
            <h2 id="menu-template-title" className="menu-tpl-title">
              Taomlarni tanlang
            </h2>
            <p className="menu-tpl-sub">
              Bir nechta taomni belgilang, keyin menyuga qo&apos;shing
            </p>
          </div>
          <button type="button" onClick={onClose} className="menu-tpl-close" aria-label="Yopish">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="menu-tpl-toolbar">
          <div className="menu-tpl-search">
            <Search className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Taom qidirish..."
              className="menu-tpl-search-input"
            />
          </div>

          <div
            ref={tagScrollRef}
            onWheel={onTagWheel}
            onPointerDown={onTagPointerDown}
            onPointerMove={onTagPointerMove}
            onPointerUp={endTagDrag}
            onPointerCancel={endTagDrag}
            className="menu-template-tag-scroll menu-tpl-tags"
          >
            <button
              type="button"
              onClick={() => pickTag(null)}
              className={`menu-tpl-tag ${activeTag === null ? "is-active" : ""}`}
            >
              Hammasi
            </button>
            {MENU_FOOD_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => pickTag(tag.id)}
                className={`menu-tpl-tag ${activeTag === tag.id ? "is-active" : ""}`}
              >
                {tag.emoji} {menuFoodTagLabel(tag, "uz")}
              </button>
            ))}
          </div>
        </div>

        <div className="menu-tpl-body">
          {templates.length === 0 ? (
            <p className="menu-tpl-empty">
              {activeTag || search.trim()
                ? "Bu kategoriyada taom topilmadi"
                : "Hech narsa topilmadi"}
            </p>
          ) : (
            <div className="menu-tpl-grid">
              {templates.map((t) => {
                const isOn = Boolean(selected[t.id]);
                const o = overrides[t.id];
                const tagDef = getMenuFoodTag(t.menuTag);
                return (
                  <article
                    key={t.id}
                    className={`menu-tpl-card ${isOn ? "is-selected" : ""}`}
                  >
                    {isOn && <span className="menu-tpl-card-dot" aria-hidden />}

                    <div
                      className="menu-tpl-card-visual"
                      style={{
                        background:
                          tagDef?.gradient ??
                          "linear-gradient(145deg, #334155 0%, #1e293b 100%)",
                      }}
                    >
                      <span className="menu-tpl-card-emoji">{t.visualEmoji}</span>
                    </div>

                    <h3 className="menu-tpl-card-name">{t.name}</h3>
                    <p className="menu-tpl-card-cat">{t.categoryHint}</p>
                    <p className="menu-tpl-card-price">
                      {formatPrice(t.suggestedPriceSom * 100)}
                    </p>

                    <button
                      type="button"
                      onClick={() => toggle(t.id, t)}
                      className={`menu-tpl-card-btn ${isOn ? "is-selected" : ""}`}
                    >
                      {isOn ? (
                        <>
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          Tanlandi
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                          Qo&apos;shish
                        </>
                      )}
                    </button>

                    {isOn && (
                      <div className="menu-tpl-card-edit">
                        <input
                          value={o?.name ?? t.name}
                          onChange={(e) =>
                            setOverrides((prev) => ({
                              ...prev,
                              [t.id]: {
                                name: e.target.value,
                                priceSom: prev[t.id]?.priceSom ?? String(t.suggestedPriceSom),
                                categoryId: prev[t.id]?.categoryId ?? "",
                              },
                            }))
                          }
                          className="menu-tpl-field"
                          placeholder="Nom"
                        />
                        <div className="menu-tpl-field-row">
                          <input
                            type="number"
                            min={100}
                            value={o?.priceSom ?? String(t.suggestedPriceSom)}
                            onChange={(e) =>
                              setOverrides((prev) => ({
                                ...prev,
                                [t.id]: {
                                  name: prev[t.id]?.name ?? t.name,
                                  priceSom: e.target.value,
                                  categoryId: prev[t.id]?.categoryId ?? "",
                                },
                              }))
                            }
                            className="menu-tpl-field"
                            placeholder="Narx"
                          />
                          <select
                            value={o?.categoryId ?? ""}
                            onChange={(e) =>
                              setOverrides((prev) => ({
                                ...prev,
                                [t.id]: {
                                  name: prev[t.id]?.name ?? t.name,
                                  priceSom: prev[t.id]?.priceSom ?? String(t.suggestedPriceSom),
                                  categoryId: e.target.value,
                                },
                              }))
                            }
                            className="menu-tpl-field"
                          >
                            <option value="">Avto</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="menu-tpl-error">{error}</p>}

        <footer className="menu-tpl-foot">
          <div className="menu-tpl-count">
            <span className="menu-tpl-count-dot" />
            <span>
              <strong>{selectedIds.length}</strong> ta tanlandi
            </span>
          </div>
          <div className="menu-tpl-foot-actions">
            <button type="button" onClick={onClose} className="menu-tpl-btn-ghost">
              Bekor
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || selectedIds.length === 0}
              className="menu-tpl-btn-primary"
            >
              {importing ? "Qo&apos;shilmoqda..." : "Menyuga qo'shish"}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
