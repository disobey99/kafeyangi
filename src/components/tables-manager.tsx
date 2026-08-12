"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, LayoutGrid, Plus, Printer, QrCode, Save } from "lucide-react";
import {
  TABLE_ZONE_LABELS,
  TABLE_ZONE_ORDER,
  type TableZone,
} from "@/lib/table-zones";

type TableRow = {
  id: string;
  number: number;
  name: string | null;
  qrToken: string;
  zone?: TableZone;
};

const NOOKLINE_MARK = "/brand/nookline-mark.png?v=5";

function printSingleQr(opts: {
  title: string;
  subtitle: string;
  cafeSlug: string;
  qrImage: string;
}) {
  const win = window.open("", "_blank", "width=420,height=640");
  if (!win) {
    window.alert("Pop-up bloklandi. Chop etish uchun brauzerda ruxsat bering.");
    return;
  }

  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${opts.title}</title>
  <style>
    @page { size: A6; margin: 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, sans-serif;
      text-align: center;
      color: #111;
      padding: 16px;
    }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .sub { font-size: 12px; color: #555; margin-bottom: 4px; }
    .slug { font-size: 11px; color: #777; margin-bottom: 16px; }
    .qr-wrap {
      position: relative;
      display: inline-block;
      width: 220px;
      height: 220px;
    }
    .qr-wrap > img.qr { width: 220px; height: 220px; display: block; }
    .qr-logo {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 48px;
      height: 48px;
      padding: 5px;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 0 0 2px #fff;
      object-fit: cover;
    }
    .hint { margin-top: 12px; font-size: 12px; color: #555; }
  </style>
</head>
<body>
  <h1>${opts.title}</h1>
  <p class="sub">${opts.subtitle}</p>
  <p class="slug">${opts.cafeSlug}</p>
  <div class="qr-wrap">
    <img class="qr" src="${opts.qrImage}" alt="${opts.title}" />
    <img class="qr-logo" src="${NOOKLINE_MARK}" alt="Nookline" />
  </div>
  <p class="hint">Skaner qiling — menyu ochiladi</p>
  <script>
    const imgs = Array.from(document.querySelectorAll("img"));
    let left = imgs.length;
    function done() {
      left -= 1;
      if (left <= 0) setTimeout(function () { window.print(); }, 80);
    }
    imgs.forEach(function (img) {
      if (img.complete) done();
      else { img.onload = done; img.onerror = done; }
    });
  </script>
</body>
</html>`);
  win.document.close();
}

function TableQrCard({
  table,
  cafeId,
  cafeSlug,
  baseUrl,
  zoneSavingId,
  onZoneChange,
  activeZones,
}: {
  table: TableRow;
  cafeId: string;
  cafeSlug: string;
  baseUrl: string;
  zoneSavingId: string | null;
  onZoneChange: (tableId: string, zone: TableZone) => void;
  activeZones: string[];
}) {
  const url = `${baseUrl}/c/${cafeSlug}/t/${table.qrToken}`;
  const qrImage = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=H&data=${encodeURIComponent(url)}`;
  const title = table.name || `Stol ${table.number}`;
  const subtitle = `№${table.number} · ${TABLE_ZONE_LABELS[table.zone ?? "HALL"] ?? table.zone}`;

  return (
    <div className="dp-card rounded-2xl p-6 text-center print:break-inside-avoid print:border print:border-stone-300 print:shadow-none">
      <p className="text-xl font-black text-[var(--dp-text)] print:text-black">
        {title}
      </p>
      <p className="mt-0.5 text-xs text-[var(--dp-muted)] print:text-stone-600">
        {subtitle}
      </p>
      <div className="mt-2 print:hidden">
        <label className="label text-xs">Zona</label>
        <select
          value={table.zone ?? "HALL"}
          disabled={zoneSavingId === table.id}
          className="input mt-1 w-full text-sm"
          onChange={(e) => onZoneChange(table.id, e.target.value as TableZone)}
        >
          {activeZones.map((zone) => (
            <option key={zone} value={zone}>
              {TABLE_ZONE_LABELS[zone] ?? zone}
            </option>
          ))}
        </select>
      </div>
      <p className="mt-0.5 text-xs text-[var(--dp-muted)] print:text-stone-600">{cafeSlug}</p>
      <div className="relative mx-auto mt-4 inline-block h-[220px] w-[220px] print:mt-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrImage}
          alt={`${title} QR`}
          className="h-full w-full"
          width={220}
          height={220}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={NOOKLINE_MARK}
          alt="Nookline"
          width={48}
          height={48}
          className="pointer-events-none absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white object-cover p-1 shadow-[0_0_0_2px_#fff]"
          draggable={false}
        />
      </div>
      <p className="mt-3 text-xs font-medium text-[var(--dp-muted)] print:hidden">
        Skaner qiling — menyu ochiladi
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block break-all text-xs text-[var(--dp-accent)] hover:underline print:hidden"
      >
        {url}
      </a>

      <div className="mt-4 flex flex-wrap justify-center gap-2 print:hidden">
        <button
          type="button"
          onClick={() =>
            printSingleQr({
              title,
              subtitle,
              cafeSlug,
              qrImage,
            })
          }
          className="btn btn-primary gap-1.5 px-3 py-2 text-xs"
        >
          <Printer className="h-3.5 w-3.5" />
          Chop etish
        </button>
        <a
          href={`/api/cafes/${cafeId}/tables/qr-pdf?tableId=${encodeURIComponent(table.id)}`}
          download
          className="btn btn-secondary gap-1.5 px-3 py-2 text-xs"
        >
          <FileDown className="h-3.5 w-3.5" />
          PDF
        </a>
      </div>
    </div>
  );
}

export function TablesManager({
  cafeId,
  cafeSlug,
  initialTables,
  maxTables,
  planName,
  baseUrl,
  isLocalhost,
  isTrialBoost,
}: {
  cafeId: string;
  cafeSlug: string;
  initialTables: TableRow[];
  maxTables: number;
  planName: string;
  baseUrl: string;
  isLocalhost: boolean;
  isTrialBoost?: boolean;
}) {
  const router = useRouter();
  const [tables, setTables] = useState(initialTables);
  const hallCount = tables.filter((t) => (t.zone ?? "HALL") === "HALL").length;
  const [tableCount, setTableCount] = useState(String(hallCount || 5));
  const [defaultSeats, setDefaultSeats] = useState("4");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [zoneSavingId, setZoneSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addZone, setAddZone] = useState<TableZone>("BOOTH");
  const [addSeats, setAddSeats] = useState("4");
  const [addName, setAddName] = useState("");
  const [customZone, setCustomZone] = useState("");

  const atLimit = tables.length >= maxTables;

  const activeZones = useMemo(() => {
    const set = new Set<string>(TABLE_ZONE_ORDER);
    for (const t of tables) {
      if (t.zone) set.add(t.zone);
    }
    return Array.from(set);
  }, [tables]);

  const tablesByZone = useMemo(() => {
    const grouped: Record<string, TableRow[]> = {};
    for (const zone of activeZones) {
      grouped[zone] = [];
    }
    for (const table of tables) {
      const z = table.zone ?? "HALL";
      if (!grouped[z]) {
        grouped[z] = [];
      }
      grouped[z].push(table);
    }
    for (const zone of Object.keys(grouped)) {
      grouped[zone].sort((a, b) => a.number - b.number);
    }
    return grouped;
  }, [tables, activeZones]);

  async function updateTableZone(tableId: string, zone: TableZone) {
    setZoneSavingId(tableId);
    try {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone }),
      });
      if (!res.ok) return;
      setTables((prev) => prev.map((t) => (t.id === tableId ? { ...t, zone } : t)));
    } finally {
      setZoneSavingId(null);
    }
  }

  async function handleBulkHall(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const count = parseInt(tableCount, 10);
    if (Number.isNaN(count) || count < 0) {
      setError("Stol soni 0 yoki undan katta bo'lishi kerak");
      return;
    }

    const otherZoneCount = tables.length - hallCount;
    if (otherZoneCount + count > maxTables) {
      setError(`${planName} tarifida jami maksimum ${maxTables} ta stol (${otherZoneCount} ta boshqa zonada)`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/tables`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count,
          defaultSeats: parseInt(defaultSeats, 10) || 4,
          defaultZone: "HALL",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      setTables(data.tables);
      setTableCount(String(data.tables.filter((t: TableRow) => (t.zone ?? "HALL") === "HALL").length));
      setSuccess(`Umumiy zal: ${count} ta stol uchun QR kodlar tayyor`);
      router.refresh();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSingle(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (atLimit) {
      setError(`${planName} tarifida maksimum ${maxTables} ta stol`);
      return;
    }

    const finalZone = addZone === "CUSTOM" ? customZone.trim() : addZone;
    if (addZone === "CUSTOM" && !customZone.trim()) {
      setError("Yangi zona nomini kiriting");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch(`/api/cafes/${cafeId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zone: finalZone,
          seats: parseInt(addSeats, 10) || 4,
          name: addName.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      setTables(data.tables);
      setAddName("");
      setCustomZone("");
      setSuccess(
        `${TABLE_ZONE_LABELS[finalZone] ?? finalZone} uchun yangi stol qo'shildi: ${data.table.name || `Stol ${data.table.number}`}`,
      );
      router.refresh();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setAdding(false);
    }
  }

  function printAll() {
    window.print();
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--dp-text)]">Stollar va QR</h1>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            Umumiy zalni ommaviy yarating, kabina va tashqari uchun alohida stol qo&apos;shing
          </p>
        </div>
        {tables.length > 0 && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <a
              href={`/api/cafes/${cafeId}/tables/qr-pdf`}
              download
              className="btn btn-primary gap-2"
            >
              <FileDown className="h-4 w-4" />
              PDF yuklab olish
            </a>
            <button type="button" onClick={printAll} className="btn btn-secondary gap-2">
              <Printer className="h-4 w-4" />
              Brauzerda chop etish
            </button>
          </div>
        )}
      </div>

      {isLocalhost && (
        <div
          className="mt-4 rounded-xl border px-4 py-3 text-sm print:hidden"
          style={{
            borderColor: "var(--dp-accent)",
            background: "var(--dp-accent-soft)",
            color: "var(--dp-text)",
          }}
        >
          <p className="font-semibold">Telefondan sinash uchun</p>
          <p className="mt-1 text-[var(--dp-muted)]">
            QR kodda <code className="rounded px-1">localhost</code> bo&apos;lsa telefon ocholmaydi.
            <code className="mx-1 rounded px-1">.env</code> faylida{" "}
            <code className="rounded px-1">NEXT_PUBLIC_APP_URL</code> ni kompyuter IP manzili bilan yozing.
          </p>
        </div>
      )}

      <p className="mt-4 text-sm text-[var(--dp-muted)] print:hidden">
        Jami: <strong>{tables.length}</strong> / {maxTables} ta stol
        {isTrialBoost ? (
          <span style={{ color: "var(--dp-accent)" }}> (sinov davri)</span>
        ) : (
          <span> ({planName})</span>
        )}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 print:hidden">
        <form onSubmit={handleBulkHall} className="dp-card rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-[var(--dp-accent)]" />
            <h2 className="font-semibold text-[var(--dp-text)]">Umumiy zal</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--dp-muted)]">
            Zal stollarini bir vaqtda yarating (1, 2, 3…)
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="label" htmlFor="table-count">
                Nechta stol?
              </label>
              <input
                id="table-count"
                type="number"
                min={0}
                max={maxTables}
                value={tableCount}
                onChange={(e) => setTableCount(e.target.value)}
                className="input w-32"
                placeholder="Masalan 12"
              />
            </div>
            <div>
              <label className="label" htmlFor="default-seats">
                O&apos;rinlari
              </label>
              <input
                id="default-seats"
                type="number"
                min={1}
                max={99}
                value={defaultSeats}
                onChange={(e) => setDefaultSeats(e.target.value)}
                className="input w-32"
                placeholder="4"
              />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary gap-2">
              <Save className="h-4 w-4" />
              {loading ? "Saqlanmoqda..." : "Zal stollarini yaratish"}
            </button>
          </div>
        </form>

        <form onSubmit={handleAddSingle} className="dp-card rounded-2xl p-5">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[var(--dp-accent)]" />
            <h2 className="font-semibold text-[var(--dp-text)]">Alohida stol qo&apos;shish</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--dp-muted)]">
            Kabina, tashqari yoki yangi maxsus zona uchun stol va QR yarating
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="add-zone">
                Zona
              </label>
              <select
                id="add-zone"
                value={addZone}
                onChange={(e) => setAddZone(e.target.value)}
                className="input w-full"
              >
                {TABLE_ZONE_ORDER.filter((z) => z !== "HALL").map((zone) => (
                  <option key={zone} value={zone}>
                    {TABLE_ZONE_LABELS[zone]}
                  </option>
                ))}
                <option value="HALL">{TABLE_ZONE_LABELS.HALL}</option>
                <option value="CUSTOM">Yangi zona (Qo&apos;lda yozish)...</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="add-seats">
                O&apos;rinlari
              </label>
              <input
                id="add-seats"
                type="number"
                min={1}
                max={99}
                value={addSeats}
                onChange={(e) => setAddSeats(e.target.value)}
                className="input w-full"
                placeholder="4"
              />
            </div>
            {addZone === "CUSTOM" && (
              <div className="sm:col-span-2">
                <label className="label" htmlFor="custom-zone">
                  Yangi zona nomi
                </label>
                <input
                  id="custom-zone"
                  type="text"
                  required
                  value={customZone}
                  onChange={(e) => setCustomZone(e.target.value)}
                  className="input w-full"
                  placeholder="Masalan: VIP xona, Tepa qavat, Veranda"
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="label" htmlFor="add-name">
                Nomi (ixtiyoriy)
              </label>
              <input
                id="add-name"
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                className="input w-full"
                placeholder="Masalan: VIP kabina 1"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={adding || atLimit}
            className="btn btn-primary mt-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            {adding ? "Qo&apos;shilmoqda..." : atLimit ? "Limit to'lgan" : "Stol qo'shish"}
          </button>
        </form>
      </div>

      {error && <p className="mt-3 text-sm text-red-500 print:hidden">{error}</p>}
      {success && <p className="mt-3 text-sm text-emerald-600 print:hidden">{success}</p>}

      {tables.length === 0 ? (
        <div className="dp-card mt-8 rounded-2xl p-12 text-center print:hidden">
          <QrCode className="mx-auto h-12 w-12 text-[var(--dp-muted)] opacity-50" />
          <p className="mt-4 font-medium text-[var(--dp-muted)]">Hali stollar yo&apos;q</p>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            Yuqorida umumiy zal yoki alohida stol qo&apos;shing
          </p>
        </div>
      ) : (
        <div id="qr-print-area" className="mt-8 space-y-8">
          {activeZones.map((zone) => {
            const zoneTables = tablesByZone[zone] ?? [];
            if (zoneTables.length === 0) return null;
            return (
              <section key={zone}>
                <h2 className="mb-4 text-lg font-bold text-[var(--dp-text)] print:text-black">
                  {TABLE_ZONE_LABELS[zone] ?? zone}
                  <span className="ml-2 text-sm font-medium text-[var(--dp-muted)]">
                    ({zoneTables.length} ta)
                  </span>
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 print:gap-6">
                  {zoneTables.map((table) => (
                    <TableQrCard
                      key={table.id}
                      table={table}
                      cafeId={cafeId}
                      cafeSlug={cafeSlug}
                      baseUrl={baseUrl}
                      zoneSavingId={zoneSavingId}
                      onZoneChange={(id, z) => void updateTableZone(id, z)}
                      activeZones={activeZones}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
