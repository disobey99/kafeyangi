"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, KeyRound } from "lucide-react";

type PrepStation = {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
  printerHost?: string | null;
};

export function PrepStationsManager({ cafeId }: { cafeId: string }) {
  const router = useRouter();
  const [stations, setStations] = useState<PrepStation[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agentToken, setAgentToken] = useState<string | null>(null);
  const [tokenBusy, setTokenBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/cafes/${cafeId}/prep-stations?all=1`);
    if (!res.ok) return;
    const data = await res.json();
    setStations((data.stations ?? []).filter((s: PrepStation) => s.isActive));
  }

  useEffect(() => {
    load();
  }, [cafeId]);

  async function addStation(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/prep-stations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Xatolik");
        return;
      }
      setName("");
      await load();
      router.refresh();
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setLoading(false);
    }
  }

  async function setDefault(id: string) {
    await fetch(`/api/prep-stations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    await load();
    router.refresh();
  }

  async function savePrinterHost(id: string, printerHost: string) {
    await fetch(`/api/prep-stations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printerHost }),
    });
    await load();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/prep-stations/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "O'chirib bo'lmadi");
      return;
    }
    setError("");
    await load();
    router.refresh();
  }

  async function rotateToken() {
    setTokenBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/cafes/${cafeId}/print-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rotate-token" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Token yaratilmadi");
        return;
      }
      setAgentToken(data.printAgentToken);
    } catch {
      setError("Ulanish xatosi");
    } finally {
      setTokenBusy(false);
    }
  }

  return (
    <div className="dp-card mb-6 space-y-5 rounded-2xl p-5">
      <div>
        <h2 className="text-lg font-bold text-[var(--dp-text)]">Tayyorlash stansiyalari</h2>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Masalan: Oshxona, Bar, Kabob — har biri o&apos;z chekini oladi. LAN IP yoki{" "}
          <code className="text-[var(--dp-accent)]">usb</code> yozsangiz, print-agent
          brauzer oynasisiz chop etadi.
        </p>
      </div>

      <ul className="space-y-3">
        {stations.map((s) => (
          <li
            key={s.id}
            className="rounded-xl bg-[var(--dp-input-bg)] px-3 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[var(--dp-text)]">{s.name}</span>
                {s.isDefault && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                    Asosiy
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                {!s.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefault(s.id)}
                    className="text-xs font-semibold text-[var(--dp-muted)] hover:text-[var(--dp-text)]"
                  >
                    Asosiy qilish
                  </button>
                )}
                {!s.isDefault && (
                  <button
                    type="button"
                    onClick={() => remove(s.id)}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                    title="O'chirish"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <label className="mt-2 block text-[11px] font-medium text-[var(--dp-muted)]">
              Printer (LAN IP yoki USB)
              <input
                defaultValue={s.printerHost ?? ""}
                placeholder="usb  ·  usb:EPSON TM-T20  ·  192.168.1.50"
                className="input mt-1 w-full text-sm"
                onBlur={(e) => {
                  const next = e.target.value.trim();
                  if (next !== (s.printerHost ?? "")) {
                    void savePrinterHost(s.id, next);
                  }
                }}
              />
            </label>
            <p className="mt-1 text-[10px] text-[var(--dp-muted)]">
              USB: Windowsda printer o&apos;rnatilgan bo&apos;lsin. Nomini bilish: PowerShellda{" "}
              <code className="text-[var(--dp-accent)]">Get-Printer</code>
            </p>
          </li>
        ))}
      </ul>

      <form onSubmit={addStation} className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Yangi stansiya (masalan: Kabob)"
          className="input min-w-[200px] flex-1"
        />
        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--dp-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Qo&apos;shish
        </button>
      </form>

      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--dp-border)" }}
      >
        <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--dp-text)]">
          <KeyRound className="h-4 w-4 text-[var(--dp-accent)]" />
          Print-agent (oynasiz chek)
        </h3>
        <p className="mt-1 text-xs text-[var(--dp-muted)]">
          Chop kompyuterida fon dasturi ishlaydi — sahifa ochiq bo&apos;lmasa ham chek chiqadi
          (LAN yoki USB). Token yaratib, printer ulangan PCda{" "}
          <code className="text-[var(--dp-accent)]">npm run print-agent</code> ishga tushiring.
          Agent ishlaganda oshxona sahifasidagi brauzer avto-chopni o&apos;chiring — aks holda 2 ta chek chiqadi.
        </p>
        <button
          type="button"
          disabled={tokenBusy}
          onClick={() => void rotateToken()}
          className="btn btn-secondary mt-3 text-sm"
        >
          {tokenBusy ? "..." : agentToken ? "Tokenni yangilash" : "Agent token yaratish"}
        </button>
        {agentToken && (
          <div className="mt-3 space-y-1 rounded-lg bg-[var(--dp-input-bg)] p-3 font-mono text-[11px] text-[var(--dp-text)]">
            <p>PRINT_AGENT_URL=https://sizning-domen</p>
            <p>PRINT_AGENT_CAFE_ID={cafeId}</p>
            <p className="break-all">PRINT_AGENT_TOKEN={agentToken}</p>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
