"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  ClipboardList,
  PackagePlus,
  ScrollText,
  ShieldCheck,
  TimerReset,
  Truck,
  Warehouse,
} from "lucide-react";
import {
  formatQtyBase,
  fromQtyBase,
  toQtyBase,
} from "@/lib/warehouse-units";

type MaterialStock = {
  id: string;
  name: string;
  baseUnit: string;
  minQtyBase: number | null;
  reorderQtyBase: number | null;
  balanceBase: number;
  isLow: boolean;
};

type Movement = {
  id: string;
  movementType: string;
  direction: string;
  qty: number;
  unit: string;
  note: string | null;
  createdAt: string;
  rawMaterial: { name: string };
  warehouse: { name: string };
};

type AlertItem = {
  rawMaterialId: string;
  name: string;
  minQtyBase: number;
  currentQtyBase: number;
  baseUnit: string;
};

type ExpiryLot = {
  id: string;
  lotCode: string;
  qtyBase: number;
  expiresAt: string;
  rawMaterial: { name: string; baseUnit?: string };
  warehouse: { name: string };
};

type WarehouseRow = {
  id: string;
  name: string;
  code: string;
  isPrimary: boolean;
};

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
};

type CountSession = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
};

type TransferRow = {
  id: string;
  transferNo: string;
  status: string;
  createdAt: string;
  fromWarehouse: { name: string };
  toWarehouse: { name: string };
  items: Array<{ qty: number; unit: string; rawMaterial: { name: string } }>;
};

const TABS = [
  { id: "stock", label: "Qoldiq", icon: Warehouse },
  { id: "movements", label: "Harakatlar", icon: ClipboardList },
  { id: "receipts", label: "Kirim", icon: PackagePlus },
  { id: "transfers", label: "Transfer", icon: ArrowLeftRight },
  { id: "lots", label: "Partiya", icon: TimerReset },
  { id: "counts", label: "Inventarizatsiya", icon: ShieldCheck },
  { id: "suppliers", label: "Yetkazuvchi", icon: Truck },
  { id: "alerts", label: "Ogohlantirish", icon: AlertTriangle },
  { id: "reports", label: "Hisobot", icon: ScrollText },
] as const;

type TabId = (typeof TABS)[number]["id"];

function unitKindFor(unit: string) {
  if (unit === "KG" || unit === "G") return "MASS";
  if (unit === "L" || unit === "ML") return "VOLUME";
  return "COUNT";
}

export function WarehouseHub({
  cafeId,
  initialTab = "stock",
}: {
  cafeId: string;
  initialTab?: TabId;
}) {
  const [tab, setTab] = useState<TabId>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [stock, setStock] = useState<MaterialStock[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [expirySoon, setExpirySoon] = useState<ExpiryLot[]>([]);
  const [reportTop, setReportTop] = useState<
    Array<{ name: string; qtyBase: number; baseUnit: string }>
  >([]);
  const [movementAgg, setMovementAgg] = useState<
    Array<{ movementType: string; _count: { id: number }; _sum: { qtyBase: number | null } }>
  >([]);
  const [recentVariance, setRecentVariance] = useState<
    Array<{
      varianceQtyBase: number;
      rawMaterial: { name: string; baseUnit: string };
      createdAt: string;
    }>
  >([]);
  const [lots, setLots] = useState<
    Array<{
      id: string;
      lotCode: string;
      qtyBase: number;
      expiresAt: string | null;
      rawMaterial: { name: string; baseUnit?: string };
    }>
  >([]);
  const [counts, setCounts] = useState<CountSession[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [transfers, setTransfers] = useState<TransferRow[]>([]);

  // forms
  const [receiptMaterialId, setReceiptMaterialId] = useState("");
  const [receiptQty, setReceiptQty] = useState("1");
  const [receiptCost, setReceiptCost] = useState("0");
  const [receiptSupplierId, setReceiptSupplierId] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState("");
  const [newMaterialUnit, setNewMaterialUnit] = useState<"PC" | "KG" | "G" | "L" | "ML">("PC");
  const [newMaterialMin, setNewMaterialMin] = useState("0");
  const [materialBusy, setMaterialBusy] = useState(false);

  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [transferMaterialId, setTransferMaterialId] = useState("");
  const [transferQty, setTransferQty] = useState("1");
  const [transferBusy, setTransferBusy] = useState(false);

  const [countTitle, setCountTitle] = useState("Kunlik inventarizatsiya");
  const [countLines, setCountLines] = useState<Record<string, string>>({});
  const [countBusy, setCountBusy] = useState(false);

  const [newWhName, setNewWhName] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [
        stockRes,
        moveRes,
        alertRes,
        reportRes,
        lotRes,
        countRes,
        whRes,
        supRes,
        trRes,
      ] = await Promise.all([
        fetch(`/api/cafes/${cafeId}/warehouse/stock`),
        fetch(`/api/cafes/${cafeId}/warehouse/movements`),
        fetch(`/api/cafes/${cafeId}/warehouse/alerts`),
        fetch(`/api/cafes/${cafeId}/warehouse/reports`),
        fetch(`/api/cafes/${cafeId}/warehouse/lots`),
        fetch(`/api/cafes/${cafeId}/warehouse/counts-list`),
        fetch(`/api/cafes/${cafeId}/warehouse/warehouses`),
        fetch(`/api/cafes/${cafeId}/warehouse/suppliers`),
        fetch(`/api/cafes/${cafeId}/warehouse/transfers`),
      ]);
      const [
        stockData,
        moveData,
        alertData,
        reportData,
        lotData,
        countData,
        whData,
        supData,
        trData,
      ] = await Promise.all([
        stockRes.json(),
        moveRes.json(),
        alertRes.json(),
        reportRes.json(),
        lotRes.json(),
        countRes.json(),
        whRes.json(),
        supRes.json(),
        trRes.json(),
      ]);
      if (!stockRes.ok) throw new Error(stockData.error || "Ombor ma'lumotlari yuklanmadi");
      setStock(stockData.stock ?? []);
      setMovements(moveData.movements ?? []);
      setAlerts(alertData.lowStock ?? []);
      setExpirySoon(alertData.expirySoon ?? []);
      setReportTop(reportData.topConsumption ?? []);
      setMovementAgg(reportData.movementAgg ?? []);
      setRecentVariance(reportData.recentVariance ?? []);
      setLots(lotData.lots ?? []);
      setCounts(countData.sessions ?? []);
      setWarehouses(whData.warehouses ?? []);
      setSuppliers(supData.suppliers ?? []);
      setTransfers(trData.transfers ?? []);

      const whs: WarehouseRow[] = whData.warehouses ?? [];
      if (whs.length >= 2) {
        setTransferFromId((prev) => prev || whs[0].id);
        setTransferToId((prev) => prev || whs[1].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeId]);

  const selectedReceiptMaterial = useMemo(
    () => stock.find((m) => m.id === receiptMaterialId) ?? null,
    [stock, receiptMaterialId],
  );

  const recentReceipts = useMemo(
    () => movements.filter((m) => m.movementType === "RECEIPT").slice(0, 20),
    [movements],
  );

  function flashOk(msg: string) {
    setOkMsg(msg);
    setError("");
    window.setTimeout(() => setOkMsg(""), 4000);
  }

  async function createMaterial() {
    const name = newMaterialName.trim();
    if (!name || materialBusy) return;
    setMaterialBusy(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/warehouse/materials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          baseUnit: newMaterialUnit,
          unitKind: unitKindFor(newMaterialUnit),
          minQtyBase: toQtyBase(newMaterialUnit, Number(newMaterialMin) || 0),
          trackLots: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xomashyo yaratilmadi");
      setNewMaterialName("");
      setNewMaterialMin("0");
      flashOk(`«${name}» qo‘shildi`);
      await loadAll();
      if (data.material?.id) setReceiptMaterialId(data.material.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setMaterialBusy(false);
    }
  }

  async function saveMinQty(
    materialId: string,
    displayMin: number,
    baseUnit: string,
  ) {
    const res = await fetch(`/api/cafes/${cafeId}/warehouse/materials/${materialId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minQtyBase: toQtyBase(baseUnit, displayMin) }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Saqlanmadi");
      return;
    }
    flashOk("Minimum qoldiq saqlandi");
    await loadAll();
  }

  async function quickReceipt() {
    if (!receiptMaterialId || receiptBusy) return;
    const material = stock.find((m) => m.id === receiptMaterialId);
    if (!material) return;
    setReceiptBusy(true);
    try {
      const costSom = Number(receiptCost) || 0;
      const res = await fetch(`/api/cafes/${cafeId}/warehouse/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: receiptSupplierId || null,
          items: [
            {
              rawMaterialId: receiptMaterialId,
              unit: material.baseUnit,
              qty: Number(receiptQty) || 1,
              unitCostTiyin: Math.round(costSom * 100),
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kirim saqlanmadi");
      flashOk(`Kirim: ${material.name} +${Number(receiptQty) || 1} ${material.baseUnit}`);
      setReceiptQty("1");
      setReceiptCost("0");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setReceiptBusy(false);
    }
  }

  async function doTransfer() {
    if (!transferFromId || !transferToId || !transferMaterialId || transferBusy) return;
    const material = stock.find((m) => m.id === transferMaterialId);
    if (!material) return;
    setTransferBusy(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/warehouse/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromWarehouseId: transferFromId,
          toWarehouseId: transferToId,
          items: [
            {
              rawMaterialId: transferMaterialId,
              unit: material.baseUnit,
              qty: Number(transferQty) || 1,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transfer xatosi");
      flashOk("Transfer bajarildi");
      setTransferQty("1");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setTransferBusy(false);
    }
  }

  async function createWarehouse() {
    const name = newWhName.trim();
    if (!name) return;
    const res = await fetch(`/api/cafes/${cafeId}/warehouse/warehouses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Ombor yaratilmadi");
      return;
    }
    setNewWhName("");
    flashOk(`Ombor «${name}» qo‘shildi`);
    await loadAll();
  }

  async function createSupplier() {
    const name = newSupplierName.trim();
    if (!name) return;
    const res = await fetch(`/api/cafes/${cafeId}/warehouse/suppliers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: newSupplierPhone || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Yetkazuvchi yaratilmadi");
      return;
    }
    setNewSupplierName("");
    setNewSupplierPhone("");
    flashOk(`Yetkazuvchi «${name}» qo‘shildi`);
    await loadAll();
  }

  async function submitCount() {
    if (countBusy || stock.length === 0) return;
    setCountBusy(true);
    try {
      const lines = stock.map((m) => {
        const display =
          countLines[m.id] !== undefined && countLines[m.id] !== ""
            ? Number(countLines[m.id])
            : fromQtyBase(m.baseUnit, m.balanceBase);
        return {
          rawMaterialId: m.id,
          countedQtyBase: toQtyBase(m.baseUnit, Number(display) || 0),
        };
      });
      const res = await fetch(`/api/cafes/${cafeId}/warehouse/counts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: countTitle.trim() || "Inventarizatsiya",
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Session yaratilmadi");
      flashOk("Inventarizatsiya saqlandi — tasdiqlang");
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xatolik");
    } finally {
      setCountBusy(false);
    }
  }

  async function approveCount(sessionId: string) {
    const res = await fetch(
      `/api/cafes/${cafeId}/warehouse/counts/${sessionId}/approve`,
      { method: "POST" },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Tasdiqlanmadi");
      return;
    }
    flashOk(`Tasdiqlandi · ${data.adjusted ?? 0} ta tuzatish`);
    await loadAll();
  }

  return (
    <div className="space-y-4">
      <header className="dp-card rounded-2xl p-4">
        <h1 className="text-xl font-bold text-[var(--dp-text)]">Enterprise Ombor</h1>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Xomashyo, kirim, transfer, inventarizatsiya va hisobotlar
        </p>
      </header>

      <div className="menu-tag-filter-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`menu-tag-chip ${tab === t.id ? "is-active" : ""}`}
          >
            <t.icon className="h-4 w-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</p>
      )}
      {okMsg && (
        <p className="rounded-xl bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{okMsg}</p>
      )}

      {loading ? (
        <div className="dp-card rounded-2xl p-6 text-sm text-[var(--dp-muted)]">Yuklanmoqda...</div>
      ) : (
        <>
          {tab === "stock" && (
            <div className="space-y-4">
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Yangi xomashyo</h2>
                <div className="grid gap-2 sm:grid-cols-4">
                  <input
                    className="input sm:col-span-2"
                    placeholder="Nomi (Un, Yog‘...)"
                    value={newMaterialName}
                    onChange={(e) => setNewMaterialName(e.target.value)}
                  />
                  <select
                    className="input"
                    value={newMaterialUnit}
                    onChange={(e) =>
                      setNewMaterialUnit(e.target.value as typeof newMaterialUnit)
                    }
                  >
                    <option value="PC">dona</option>
                    <option value="KG">kg</option>
                    <option value="G">g</option>
                    <option value="L">litr</option>
                    <option value="ML">ml</option>
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    placeholder="Min qoldiq"
                    value={newMaterialMin}
                    onChange={(e) => setNewMaterialMin(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary mt-3"
                  disabled={materialBusy || !newMaterialName.trim()}
                  onClick={() => void createMaterial()}
                >
                  {materialBusy ? "..." : "Xomashyo qo‘shish"}
                </button>
              </div>

              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Qoldiq holati</h2>
                {stock.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">
                    Hali xomashyo yo‘q. Yuqoridan qo‘shing, keyin «Kirim» qiling.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stock.map((row) => (
                      <div
                        key={row.id}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
                          row.isLow
                            ? "border-red-400/50 bg-red-500/10"
                            : "border-[var(--dp-border)]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--dp-text)]">{row.name}</p>
                          <p className="text-xs text-[var(--dp-muted)]">
                            Min:{" "}
                            {formatQtyBase(row.minQtyBase ?? 0, row.baseUnit)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            className="input w-24 py-1 text-xs"
                            type="number"
                            min={0}
                            step="any"
                            defaultValue={fromQtyBase(
                              row.baseUnit,
                              row.minQtyBase ?? 0,
                            )}
                            title={`Minimum qoldiq (${row.baseUnit})`}
                            onBlur={(e) => {
                              const v = Number(e.target.value) || 0;
                              const prev = fromQtyBase(
                                row.baseUnit,
                                row.minQtyBase ?? 0,
                              );
                              if (v !== prev) {
                                void saveMinQty(row.id, v, row.baseUnit);
                              }
                            }}
                          />
                          <p className="min-w-[4.5rem] text-right font-semibold text-[var(--dp-accent)]">
                            {formatQtyBase(row.balanceBase, row.baseUnit)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "movements" && (
            <div className="dp-card rounded-2xl p-4">
              <h2 className="mb-3 font-semibold text-[var(--dp-text)]">So‘nggi harakatlar</h2>
              {movements.length === 0 ? (
                <p className="text-sm text-[var(--dp-muted)]">Harakatlar yo‘q</p>
              ) : (
                <div className="space-y-2">
                  {movements.slice(0, 50).map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-[var(--dp-text)]">{m.rawMaterial.name}</p>
                      <p className="text-xs text-[var(--dp-muted)]">
                        {m.movementType} · {m.direction} · {m.qty} {m.unit} · {m.warehouse.name} ·{" "}
                        {new Date(m.createdAt).toLocaleString("uz-UZ")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "receipts" && (
            <div className="space-y-4">
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-1 font-semibold text-[var(--dp-text)]">Tez kirim</h2>
                <p className="mb-3 text-xs text-[var(--dp-muted)]">
                  Ombor qoldig‘ini oshirish — yetkazib beruvchidan kelgan mahsulot
                </p>
                {stock.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">
                    Avval «Qoldiq» bo‘limidan xomashyo qo‘shing.
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <select
                      className="input"
                      value={receiptMaterialId}
                      onChange={(e) => setReceiptMaterialId(e.target.value)}
                    >
                      <option value="">Xomashyo</option>
                      {stock.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.baseUnit})
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={receiptQty}
                      onChange={(e) => setReceiptQty(e.target.value)}
                      placeholder={`Miqdor ${selectedReceiptMaterial?.baseUnit ?? ""}`}
                    />
                    <input
                      className="input"
                      type="number"
                      min={0}
                      value={receiptCost}
                      onChange={(e) => setReceiptCost(e.target.value)}
                      placeholder="Narx (so‘m)"
                    />
                    <select
                      className="input"
                      value={receiptSupplierId}
                      onChange={(e) => setReceiptSupplierId(e.target.value)}
                    >
                      <option value="">Yetkazuvchi (ixtiyoriy)</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-primary sm:col-span-2 lg:col-span-4"
                      disabled={receiptBusy || !receiptMaterialId}
                      onClick={() => void quickReceipt()}
                    >
                      {receiptBusy ? "Saqlanmoqda…" : "Kirim qo‘shish"}
                    </button>
                  </div>
                )}
              </div>
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">So‘nggi kirimlar</h2>
                {recentReceipts.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Hali kirim yo‘q</p>
                ) : (
                  <div className="space-y-2">
                    {recentReceipts.map((m) => (
                      <div
                        key={m.id}
                        className="flex justify-between rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-[var(--dp-text)]">{m.rawMaterial.name}</p>
                          <p className="text-xs text-[var(--dp-muted)]">
                            {new Date(m.createdAt).toLocaleString("uz-UZ")}
                          </p>
                        </div>
                        <p className="font-semibold text-emerald-600">
                          +{m.qty} {m.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "transfers" && (
            <div className="space-y-4">
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Omborlar</h2>
                <ul className="mb-3 space-y-1 text-sm">
                  {warehouses.map((w) => (
                    <li key={w.id} className="text-[var(--dp-text)]">
                      {w.name}{" "}
                      <span className="text-xs text-[var(--dp-muted)]">
                        ({w.code}
                        {w.isPrimary ? " · asosiy" : ""})
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <input
                    className="input flex-1"
                    placeholder="Yangi ombor nomi (Filial ombori...)"
                    value={newWhName}
                    onChange={(e) => setNewWhName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void createWarehouse()}
                  >
                    Ombor qo‘shish
                  </button>
                </div>
                {warehouses.length < 2 && (
                  <p className="mt-2 text-xs text-[var(--dp-muted)]">
                    Transfer uchun kamida 2 ta ombor kerak. Ikkinchi omborni qo‘shing.
                  </p>
                )}
              </div>

              {warehouses.length >= 2 && (
                <div className="dp-card rounded-2xl p-4">
                  <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Transfer</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="input"
                      value={transferFromId}
                      onChange={(e) => setTransferFromId(e.target.value)}
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          Dan: {w.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input"
                      value={transferToId}
                      onChange={(e) => setTransferToId(e.target.value)}
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          Ga: {w.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input"
                      value={transferMaterialId}
                      onChange={(e) => setTransferMaterialId(e.target.value)}
                    >
                      <option value="">Xomashyo</option>
                      {stock.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="number"
                      min={1}
                      value={transferQty}
                      onChange={(e) => setTransferQty(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-primary sm:col-span-2"
                      disabled={transferBusy || !transferMaterialId}
                      onClick={() => void doTransfer()}
                    >
                      {transferBusy ? "..." : "Transfer qilish"}
                    </button>
                  </div>
                </div>
              )}

              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">So‘nggi transferlar</h2>
                {transfers.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Hali transfer yo‘q</p>
                ) : (
                  <div className="space-y-2">
                    {transfers.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-[var(--dp-text)]">
                          {t.transferNo}: {t.fromWarehouse.name} → {t.toWarehouse.name}
                        </p>
                        <p className="text-xs text-[var(--dp-muted)]">
                          {t.items
                            .map((i) => `${i.rawMaterial.name} ${i.qty}${i.unit}`)
                            .join(", ")}{" "}
                          · {new Date(t.createdAt).toLocaleString("uz-UZ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "lots" && (
            <div className="dp-card rounded-2xl p-4">
              <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Lot / yaroqlilik</h2>
              {lots.length === 0 ? (
                <p className="text-sm text-[var(--dp-muted)]">
                  Partiyalar kirim qilganda avtomatik yaratiladi
                </p>
              ) : (
                <div className="space-y-2">
                  {lots.map((lot) => (
                    <div
                      key={lot.id}
                      className="rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-[var(--dp-text)]">
                        {lot.rawMaterial.name} · {lot.lotCode}
                      </p>
                      <p className="text-xs text-[var(--dp-muted)]">
                        Qoldiq:{" "}
                        {formatQtyBase(
                          lot.qtyBase,
                          lot.rawMaterial.baseUnit ?? "G",
                        )}{" "}
                        · Expiry:{" "}
                        {lot.expiresAt
                          ? new Date(lot.expiresAt).toLocaleDateString("uz-UZ")
                          : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "counts" && (
            <div className="space-y-4">
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-1 font-semibold text-[var(--dp-text)]">Yangi inventarizatsiya</h2>
                <p className="mb-3 text-xs text-[var(--dp-muted)]">
                  Haqiqiy qoldiqni kiriting → saqlang → tasdiqlang (ombor avtomatik tuzatiladi)
                </p>
                <input
                  className="input mb-3"
                  value={countTitle}
                  onChange={(e) => setCountTitle(e.target.value)}
                  placeholder="Session nomi"
                />
                {stock.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Avval xomashyo qo‘shing</p>
                ) : (
                  <div className="space-y-2">
                    {stock.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-[var(--dp-text)]">{m.name}</p>
                          <p className="text-xs text-[var(--dp-muted)]">
                            Tizim: {formatQtyBase(m.balanceBase, m.baseUnit)}
                          </p>
                        </div>
                        <input
                          className="input w-28"
                          type="number"
                          min={0}
                          step="any"
                          placeholder={String(
                            fromQtyBase(m.baseUnit, m.balanceBase),
                          )}
                          value={countLines[m.id] ?? ""}
                          onChange={(e) =>
                            setCountLines((prev) => ({ ...prev, [m.id]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-primary w-full"
                      disabled={countBusy}
                      onClick={() => void submitCount()}
                    >
                      {countBusy ? "..." : "Inventarizatsiyani saqlash"}
                    </button>
                  </div>
                )}
              </div>

              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Sessionlar</h2>
                {counts.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Hali session yo‘q</p>
                ) : (
                  <div className="space-y-2">
                    {counts.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-[var(--dp-text)]">{s.title}</p>
                          <p className="text-xs text-[var(--dp-muted)]">
                            {s.status} · {new Date(s.createdAt).toLocaleString("uz-UZ")}
                          </p>
                        </div>
                        {s.status !== "APPROVED" && s.status !== "CANCELLED" && (
                          <button
                            type="button"
                            className="btn btn-secondary text-xs"
                            onClick={() => void approveCount(s.id)}
                          >
                            Tasdiqlash (qoldiqni tuzatish)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "suppliers" && (
            <div className="space-y-4">
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Yangi yetkazuvchi</h2>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    className="input"
                    placeholder="Nomi"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder="Telefon"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void createSupplier()}
                  >
                    Qo‘shish
                  </button>
                </div>
              </div>
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Ro‘yxat</h2>
                {suppliers.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Hali yetkazuvchi yo‘q</p>
                ) : (
                  <div className="space-y-2">
                    {suppliers.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-[var(--dp-text)]">{s.name}</p>
                        {s.phone && (
                          <p className="text-xs text-[var(--dp-muted)]">{s.phone}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "alerts" && (
            <div className="space-y-3">
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Kam qoldiq</h2>
                {alerts.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Low-stock yo‘q</p>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((a) => (
                      <div
                        key={a.rawMaterialId}
                        className="rounded-xl bg-amber-500/10 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-[var(--dp-text)]">{a.name}</p>
                        <p className="text-xs text-[var(--dp-muted)]">
                          Hozir: {formatQtyBase(a.currentQtyBase, a.baseUnit)} ·
                          Min: {formatQtyBase(a.minQtyBase, a.baseUnit)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">
                  Yaroqlilik (7 kun ichida)
                </h2>
                {expirySoon.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Yaqin muddati o‘tadigan lot yo‘q</p>
                ) : (
                  <div className="space-y-2">
                    {expirySoon.map((lot) => (
                      <div
                        key={lot.id}
                        className="rounded-xl border border-amber-400/40 px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-[var(--dp-text)]">
                          {lot.rawMaterial.name} · {lot.lotCode}
                        </p>
                        <p className="text-xs text-[var(--dp-muted)]">
                          {lot.warehouse.name} ·{" "}
                          {formatQtyBase(
                            lot.qtyBase,
                            lot.rawMaterial.baseUnit ?? "G",
                          )}{" "}
                          · {new Date(lot.expiresAt).toLocaleDateString("uz-UZ")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "reports" && (
            <div className="space-y-4">
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Harakatlar bo‘yicha</h2>
                {movementAgg.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Ma’lumot yo‘q</p>
                ) : (
                  <div className="space-y-2">
                    {movementAgg.map((row) => (
                      <div
                        key={row.movementType}
                        className="flex justify-between rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                      >
                        <span className="text-[var(--dp-text)]">{row.movementType}</span>
                        <span className="text-[var(--dp-muted)]">
                          {row._count.id} ta · Σ {row._sum.qtyBase ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Top sarf (buyurtma)</h2>
                {reportTop.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">
                    Ratsiya (recipe) ulangan mahsulotlar sotilganda chiqadi
                  </p>
                ) : (
                  <div className="space-y-2">
                    {reportTop.map((r) => (
                      <div
                        key={r.name}
                        className="flex justify-between rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                      >
                        <span className="text-[var(--dp-text)]">{r.name}</span>
                        <span className="font-semibold text-[var(--dp-accent)]">
                          {formatQtyBase(r.qtyBase, r.baseUnit)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="dp-card rounded-2xl p-4">
                <h2 className="mb-3 font-semibold text-[var(--dp-text)]">Inventar farqlari</h2>
                {recentVariance.length === 0 ? (
                  <p className="text-sm text-[var(--dp-muted)]">Farqlar yo‘q</p>
                ) : (
                  <div className="space-y-2">
                    {recentVariance.slice(0, 20).map((v, i) => (
                      <div
                        key={`${v.rawMaterial.name}-${i}`}
                        className="flex justify-between rounded-xl border border-[var(--dp-border)] px-3 py-2 text-sm"
                      >
                        <span className="text-[var(--dp-text)]">{v.rawMaterial.name}</span>
                        <span
                          className={
                            v.varianceQtyBase === 0
                              ? "text-[var(--dp-muted)]"
                              : v.varianceQtyBase > 0
                                ? "text-emerald-600"
                                : "text-red-500"
                          }
                        >
                          {v.varianceQtyBase > 0 ? "+" : ""}
                          {formatQtyBase(
                            Math.abs(v.varianceQtyBase),
                            v.rawMaterial.baseUnit,
                          )}
                          {v.varianceQtyBase < 0 ? " (kam)" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
