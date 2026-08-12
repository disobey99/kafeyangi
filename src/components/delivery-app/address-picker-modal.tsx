"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, LocateFixed, MapPin, Plus, Trash2, X } from "lucide-react";
import type { MenuLocale } from "@/lib/menu-i18n";
import { getDeliveryUiLabels } from "@/lib/delivery-ui-labels";
import { reverseGeocodeClient } from "@/lib/client-geolocation";
import { getBrowserPosition } from "./geo-client";
import { BAEMIN_TEAL } from "./theme";

export type AddressGeo = { lat: number; lng: number };

function useDeliveryThemeVars(open: boolean) {
  const [vars, setVars] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!open) return;
    const root = document.querySelector(".delivery-app-root");
    if (!(root instanceof HTMLElement)) return;
    const cs = getComputedStyle(root);
    setVars({
      ["--da-card"]: cs.getPropertyValue("--da-card").trim() || "#f4f6f7",
      ["--da-ink"]: cs.getPropertyValue("--da-ink").trim() || "#1a1d26",
      ["--da-muted"]: cs.getPropertyValue("--da-muted").trim() || "#6b7280",
      ["--da-border"]: cs.getPropertyValue("--da-border").trim() || "rgba(26,29,38,0.08)",
      ["--da-input"]: cs.getPropertyValue("--da-input").trim() || "#eef1f3",
      ["--da-accent"]: cs.getPropertyValue("--da-accent").trim() || BAEMIN_TEAL,
    } as React.CSSProperties);
  }, [open]);

  return vars;
}

export function AddressPickerModal({
  open,
  locale,
  selected,
  addresses,
  onClose,
  onSelect,
  onAdd,
  onDelete,
}: {
  open: boolean;
  locale: MenuLocale;
  selected: string;
  addresses: string[];
  onClose: () => void;
  onSelect: (address: string) => void;
  onAdd: (address: string, geo?: AddressGeo) => void;
  onDelete?: (address: string) => void;
}) {
  const ui = getDeliveryUiLabels(locale);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [draftGeo, setDraftGeo] = useState<AddressGeo | null>(null);
  const [mounted, setMounted] = useState(false);
  const themeVars = useDeliveryThemeVars(open);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setAdding(false);
      setDraft("");
      setGeoBusy(false);
      setGeoMsg("");
      setDraftGeo(null);
    }
  }, [open]);

  async function detectCurrentLocation() {
    setGeoBusy(true);
    setGeoMsg("");
    try {
      const pos = await getBrowserPosition();
      const location = await reverseGeocodeClient(pos.lat, pos.lng);
      setDraft(location.address);
      setDraftGeo({ lat: location.latitude, lng: location.longitude });
      setGeoMsg(ui.gpsSuccessLabel);
      setAdding(true);
    } catch (e) {
      setGeoMsg(e instanceof Error ? e.message : ui.gpsError);
    } finally {
      setGeoBusy(false);
    }
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const next = draft.trim();
    if (!next) return;
    onAdd(next, draftGeo ?? undefined);
    onClose();
  }

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center"
      style={themeVars}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label={ui.cancelBtn}
        onClick={onClose}
      />
      <div
        className="relative z-[1] w-full max-w-md rounded-t-3xl border px-5 pt-5 shadow-2xl sm:rounded-3xl"
        style={{
          background: "var(--da-card, #fff)",
          borderColor: "var(--da-border, #e7e5e4)",
          color: "var(--da-ink, #1c1917)",
          paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
        }}
        role="dialog"
        aria-label={ui.deliveryAddressTitle}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-extrabold">{ui.deliveryAddressTitle}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--da-muted)" }}>
              {ui.addressPickerHint}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2"
            style={{ color: "var(--da-muted)" }}
            aria-label={ui.cancelBtn}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="max-h-[32vh] space-y-2 overflow-y-auto">
          {addresses.length === 0 ? (
            <li
              className="rounded-2xl px-3 py-5 text-center text-sm"
              style={{ color: "var(--da-muted)", background: "var(--da-input)" }}
            >
              {ui.noSavedAddresses}
            </li>
          ) : (
            addresses.map((addr) => {
              const active = addr === selected;
              return (
                <li key={addr} className="flex items-stretch gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(addr);
                      onClose();
                    }}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-2xl border px-3 py-3 text-left transition"
                    style={{
                      background: active
                        ? "color-mix(in srgb, var(--da-accent, #2ac1bc) 14%, var(--da-card))"
                        : "var(--da-input)",
                      borderColor: active
                        ? "color-mix(in srgb, var(--da-accent, #2ac1bc) 45%, transparent)"
                        : "var(--da-border)",
                    }}
                  >
                    <MapPin
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: active ? BAEMIN_TEAL : "var(--da-muted)" }}
                    />
                    <span className="min-w-0 flex-1 text-sm font-semibold leading-snug">
                      {addr}
                    </span>
                    {active ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BAEMIN_TEAL }} />
                    ) : null}
                  </button>
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => {
                        const ok =
                          typeof window !== "undefined"
                            ? window.confirm(ui.confirmDeleteAddress)
                            : true;
                        if (!ok) return;
                        onDelete(addr);
                      }}
                      className="flex shrink-0 items-center justify-center rounded-2xl border px-3 transition"
                      style={{
                        background: "color-mix(in srgb, #ef4444 12%, var(--da-card))",
                        borderColor: "color-mix(in srgb, #ef4444 35%, transparent)",
                        color: "#ef4444",
                      }}
                      aria-label={ui.deleteAddress}
                      title={ui.deleteAddress}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>

        {adding ? (
          <form onSubmit={submitNew} className="mt-4 space-y-2">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftGeo(null);
              }}
              rows={3}
              placeholder={ui.addressPlaceholder}
              className="w-full resize-none rounded-2xl border px-3 py-3 text-sm font-medium outline-none"
              style={{
                background: "var(--da-input)",
                borderColor: "var(--da-border)",
                color: "var(--da-ink)",
              }}
            />
            <button
              type="button"
              disabled={geoBusy}
              onClick={() => void detectCurrentLocation()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-2.5 text-xs font-extrabold disabled:opacity-60"
              style={{
                borderColor: "color-mix(in srgb, var(--da-accent) 35%, var(--da-border))",
                background: "color-mix(in srgb, var(--da-accent) 10%, var(--da-card))",
                color: "var(--da-ink)",
              }}
            >
              <LocateFixed className={`h-4 w-4 ${geoBusy ? "animate-pulse" : ""}`} />
              {geoBusy ? ui.gpsCapturing : ui.useCurrentLocation}
            </button>
            {geoMsg ? (
              <p className="text-[11px] font-medium" style={{ color: "var(--da-muted)" }}>
                {geoMsg}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setDraft("");
                  setDraftGeo(null);
                  setGeoMsg("");
                }}
                className="flex-1 rounded-2xl border py-2.5 text-sm font-bold"
                style={{ borderColor: "var(--da-border)", color: "var(--da-muted)" }}
              >
                {ui.cancelBtn}
              </button>
              <button
                type="submit"
                disabled={!draft.trim()}
                className="flex-1 rounded-2xl py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: BAEMIN_TEAL }}
              >
                {ui.saveAddress}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled={geoBusy}
              onClick={() => void detectCurrentLocation()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-extrabold disabled:opacity-60"
              style={{
                borderColor: "color-mix(in srgb, var(--da-accent) 35%, var(--da-border))",
                background: "color-mix(in srgb, var(--da-accent) 10%, var(--da-card))",
                color: "var(--da-ink)",
              }}
            >
              <LocateFixed className={`h-4 w-4 ${geoBusy ? "animate-pulse" : ""}`} />
              {geoBusy ? ui.gpsCapturing : ui.useCurrentLocation}
            </button>
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-extrabold text-white"
              style={{ background: BAEMIN_TEAL }}
            >
              <Plus className="h-4 w-4" />
              {ui.addNewAddress}
            </button>
            {geoMsg ? (
              <p className="text-center text-[11px] font-medium" style={{ color: "var(--da-muted)" }}>
                {geoMsg}
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
