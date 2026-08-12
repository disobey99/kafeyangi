"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";
import type { FloorDisplayStatus } from "@/lib/floor-display";
import { TableOccupiedTimer } from "@/components/table-occupied-timer";
import {
  TABLE_ZONE_LABELS,
  TABLE_ZONE_ORDER,
  tableZoneLabel,
  type TableZone,
} from "@/lib/table-zones";

export type FloorMapTable = {
  id: string;
  number: number;
  name: string | null;
  status: string;
  statusLabel: string;
  displayStatus?: FloorDisplayStatus;
  displayLabel?: string;
  seats: number;
  zone?: TableZone;
  posX: number;
  posY: number;
  assignedWaiter?: { id: string; name: string } | null;
  guestLabel?: string | null;
  occupiedSince?: string | null;
  openOrderCount?: number;
  openTotal?: number;
  activeOrder?: {
    orderNumber: number;
    totalAmount: number;
  } | null;
};

const DISPLAY_CLASS: Record<FloorDisplayStatus, string> = {
  FREE: "floor-plan-table-free",
  OCCUPIED: "floor-plan-table-busy",
  READY: "floor-plan-table-ready",
  BILL_REQUESTED: "floor-plan-table-bill",
};

const DOT_CLASS: Record<FloorDisplayStatus, string> = {
  FREE: "floor-plan-dot-free",
  OCCUPIED: "floor-plan-dot-busy",
  READY: "floor-plan-dot-ready",
  BILL_REQUESTED: "floor-plan-dot-bill",
};

const GUEST_CLASS: Record<FloorDisplayStatus, string> = {
  FREE: "",
  OCCUPIED: "floor-plan-table-guest-busy",
  READY: "floor-plan-table-guest-ready",
  BILL_REQUESTED: "floor-plan-table-guest-bill",
};

function resolveDisplay(table: FloorMapTable): FloorDisplayStatus {
  if (table.displayStatus) return table.displayStatus;
  if (table.status === "BILL_REQUESTED") return "BILL_REQUESTED";
  if (table.status === "OCCUPIED" || (table.openOrderCount ?? 0) > 0) return "OCCUPIED";
  return "FREE";
}

function TableCard({
  table,
  seats,
  selected,
  editable,
  currentWaiterId,
  onClick,
  onDoubleClick,
}: {
  table: FloorMapTable;
  seats: number;
  selected: boolean;
  editable: boolean;
  currentWaiterId?: string;
  onClick: () => void;
  onDoubleClick?: () => void;
}) {
  const display = resolveDisplay(table);
  const statusClass = DISPLAY_CLASS[display];
  const dotClass = DOT_CLASS[display];
  const guestClass = GUEST_CLASS[display];
  const label = table.displayLabel ?? (display === "FREE" ? "Bo'sh" : table.statusLabel);
  const amount =
    (table.openOrderCount ?? 0) > 0 ? table.openTotal : table.activeOrder?.totalAmount;
  const guest =
    table.guestLabel ??
    (table.assignedWaiter && (!currentWaiterId || table.assignedWaiter.id === currentWaiterId)
      ? table.assignedWaiter.id === currentWaiterId
        ? "Siz"
        : table.assignedWaiter.name
      : null);
  const occupiedSince = table.occupiedSince;
  const showMeta =
    display !== "FREE" &&
    (guest || (amount != null && amount > 0) || occupiedSince);

  return (
    <button
      type="button"
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`floor-plan-table ${statusClass} ${
        selected ? "floor-plan-table-selected" : ""
      }`}
      title={`Stol ${table.number} · ${label}`}
    >
      <div className="floor-plan-table-head">
        <span className="floor-plan-table-no">{table.number}</span>
        <i className={`floor-plan-dot ${dotClass}`} aria-hidden />
      </div>

      {showMeta ? (
        <div className="floor-plan-table-body">
          {guest && (
            <span className={`floor-plan-table-guest ${guestClass}`.trim()}>{guest}</span>
          )}
          {amount != null && amount > 0 && (
            <span className="floor-plan-table-sum">{formatPrice(amount)}</span>
          )}
          {occupiedSince && <TableOccupiedTimer since={occupiedSince} />}
        </div>
      ) : (
        <div className="floor-plan-table-body floor-plan-table-body-empty" />
      )}

      <div className="floor-plan-table-foot">
        <span className="floor-plan-table-seats">{seats} o&apos;rin</span>
        <span className="floor-plan-table-status">{label}</span>
      </div>
    </button>
  );
}

type Props = {
  tables: FloorMapTable[];
  loading?: boolean;
  editable?: boolean;
  cafeId?: string;
  selectedTableId?: string | null;
  currentWaiterId?: string;
  activeZone?: TableZone;
  variant?: "default" | "cashier";
  onTableSelect?: (table: { id: string; number: number }) => void;
  onLayoutSaved?: () => void;
};

export function FloorMapCanvas({
  tables,
  loading = false,
  editable = false,
  cafeId,
  selectedTableId,
  currentWaiterId,
  activeZone,
  onTableSelect,
  onLayoutSaved,
}: Props) {
  const [seatsMap, setSeatsMap] = useState<Record<string, number>>({});
  const [zoneMap, setZoneMap] = useState<Record<string, TableZone>>({});
  const [editingSeats, setEditingSeats] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editPanelRef = useRef<HTMLDivElement | null>(null);

  const editingTable = useMemo(
    () => (editingSeats ? tables.find((t) => t.id === editingSeats) ?? null : null),
    [editingSeats, tables],
  );

  useEffect(() => {
    if (!editingSeats || !editPanelRef.current) return;
    editPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [editingSeats]);

  const visibleTables = useMemo(() => {
    const filtered = activeZone
      ? tables.filter((t) => (t.zone ?? "HALL") === activeZone)
      : tables;
    return [...filtered].sort((a, b) => a.number - b.number);
  }, [tables, activeZone]);

  useEffect(() => {
    const seats: Record<string, number> = {};
    const zones: Record<string, TableZone> = {};
    tables.forEach((t) => {
      seats[t.id] = t.seats ?? 4;
      zones[t.id] = t.zone ?? "HALL";
    });
    setSeatsMap(seats);
    setZoneMap(zones);
  }, [tables]);

  async function saveTableSettings(
    tableId: string,
    patch: { seats?: number; zone?: TableZone },
  ) {
    if (!editable || !cafeId) return;
    setSaving(true);
    try {
      const table = tables.find((t) => t.id === tableId);
      if (!table) return;
      await fetch(`/api/cafes/${cafeId}/floor`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tables: [
            {
              id: tableId,
              posX: table.posX,
              posY: table.posY,
              seats: patch.seats ?? seatsMap[tableId] ?? table.seats ?? 4,
              zone: patch.zone ?? zoneMap[tableId] ?? table.zone ?? "HALL",
            },
          ],
        }),
      });
      onLayoutSaved?.();
    } finally {
      setSaving(false);
    }
  }

  async function saveSeats(tableId: string, seats: number) {
    await saveTableSettings(tableId, { seats });
  }

  async function saveZone(tableId: string, zone: TableZone) {
    await saveTableSettings(tableId, { zone });
  }

  function updateSeats(tableId: string, seats: number) {
    const next = { ...seatsMap, [tableId]: seats };
    setSeatsMap(next);
    setEditingSeats(null);
    void saveSeats(tableId, seats);
  }

  function updateZone(tableId: string, zone: TableZone) {
    const next = { ...zoneMap, [tableId]: zone };
    setZoneMap(next);
    void saveZone(tableId, zone);
  }

  function handleTableClick(table: FloorMapTable) {
    if (editable) {
      setEditingSeats(editingSeats === table.id ? null : table.id);
    } else {
      onTableSelect?.({ id: table.id, number: table.number });
    }
  }

  if (loading) {
    return <p className="floor-plan-muted text-sm">Yuklanmoqda...</p>;
  }

  if (tables.length === 0) {
    return (
      <p className="floor-plan-muted py-10 text-center text-sm">
        Stollar yo&apos;q — boshqaruv panelidan qo&apos;shing
      </p>
    );
  }

  if (visibleTables.length === 0) {
    return (
      <p className="floor-plan-muted py-10 text-center text-sm">
        {activeZone
          ? `${tableZoneLabel(activeZone)} zonasida hozircha stollar yo&apos;q — Stollar va QR sahifasidan biriktiring`
          : "Stollar yo&apos;q — boshqaruv panelidan qo&apos;shing"}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {editable && (
        <p className="floor-plan-muted text-xs">
          O&apos;rin soni va zona uchun stolga bosing. Holatni o&apos;zgartirish uchun ikki marta bosing.
          {saving && <span className="ml-2 text-[var(--dp-accent)]">Saqlanmoqda...</span>}
        </p>
      )}

      {editable && editingTable && (
        <div
          ref={editPanelRef}
          className="floor-plan-edit-bar sticky top-0 z-30 flex flex-wrap items-end gap-3 rounded-xl border p-3 shadow-md"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[var(--dp-text)]">
              Stol {editingTable.number} — tahrirlash
            </p>
            <p className="text-xs text-[var(--dp-muted)]">
              O&apos;rin va zonani o&apos;zgartiring, keyin boshqa stolni tanlang yoki yoping
            </p>
          </div>
          <label className="text-xs font-semibold text-[var(--dp-text)]">
            O&apos;rin soni
            <input
              type="number"
              min={1}
              max={99}
              key={`seats-${editingTable.id}`}
              defaultValue={seatsMap[editingTable.id] ?? editingTable.seats ?? 4}
              className="mt-1 block w-24 rounded border px-2 py-1.5 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateSeats(
                    editingTable.id,
                    parseInt((e.target as HTMLInputElement).value, 10) || 4,
                  );
                }
              }}
              onBlur={(e) =>
                updateSeats(editingTable.id, parseInt(e.target.value, 10) || 4)
              }
            />
          </label>
          <label className="text-xs font-semibold text-[var(--dp-text)]">
            Zona
            <select
              value={zoneMap[editingTable.id] ?? editingTable.zone ?? "HALL"}
              className="mt-1 block min-w-[9rem] rounded border px-2 py-1.5 text-sm"
              onChange={(e) =>
                updateZone(editingTable.id, e.target.value as TableZone)
              }
            >
              {TABLE_ZONE_ORDER.map((z) => (
                <option key={z} value={z}>
                  {TABLE_ZONE_LABELS[z]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-lg border border-[var(--dp-border)] px-3 py-1.5 text-sm font-medium text-[var(--dp-text)]"
            onClick={() => setEditingSeats(null)}
          >
            Yopish
          </button>
        </div>
      )}

      <div className="floor-plan-grid">
        {visibleTables.map((t) => {
          const seats = seatsMap[t.id] ?? t.seats ?? 4;
          return (
            <div key={t.id} className="relative">
              <TableCard
                table={t}
                seats={seats}
                selected={selectedTableId === t.id || editingSeats === t.id}
                editable={editable}
                currentWaiterId={currentWaiterId}
                onClick={() => handleTableClick(t)}
                onDoubleClick={
                  editable
                    ? () => onTableSelect?.({ id: t.id, number: t.number })
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
