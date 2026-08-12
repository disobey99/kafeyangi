"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { useCafeRealtime } from "@/hooks/use-cafe-realtime";
import type { CafeRole } from "@prisma/client";
import { CafeMusicPanel } from "@/components/cafe-music-panel";
import { ShiftSwapPanel } from "@/components/shift-swap-panel";

type GenericItem = Record<string, unknown>;
type OpsTab = "overview" | "communication" | "operations" | "safety";

export function OperationsHub({
  cafeId,
  role,
  userId,
}: {
  cafeId: string;
  role: CafeRole;
  userId?: string;
}) {
  const canManage = role === "OWNER" || role === "MANAGER";
  const [tab, setTab] = useState<OpsTab>("overview");
  const [referralCode, setReferralCode] = useState("");
  const [applyCode, setApplyCode] = useState("");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [notices, setNotices] = useState<GenericItem[]>([]);
  const [iotEvents, setIotEvents] = useState<GenericItem[]>([]);
  const [freshness, setFreshness] = useState<GenericItem[]>([]);
  const [breaks, setBreaks] = useState<GenericItem[]>([]);
  const [cashVariance, setCashVariance] = useState<GenericItem[]>([]);
  const [music, setMusic] = useState<GenericItem[]>([]);
  const [rush, setRush] = useState<GenericItem[]>([]);
  const [blind, setBlind] = useState<GenericItem[]>([]);
  const [msg, setMsg] = useState("");

  async function loadAll() {
    const [
      ref,
      n,
      i,
      f,
      b,
      cv,
      m,
      r,
      bl,
    ] = await Promise.all([
      fetch(`/api/cafes/${cafeId}/referral`).then((x) => x.json()).catch(() => ({})),
      fetch(`/api/cafes/${cafeId}/notices?audience=STAFF`).then((x) => x.json()).catch(() => ({})),
      fetch(`/api/cafes/${cafeId}/iot-temperature`).then((x) => x.json()).catch(() => ({})),
      fetch(`/api/cafes/${cafeId}/freshness`).then((x) => x.json()).catch(() => ({})),
      fetch(`/api/cafes/${cafeId}/breaks`).then((x) => x.json()).catch(() => ({})),
      fetch(`/api/cafes/${cafeId}/cash-variance`).then((x) => x.json()).catch(() => ({})),
      fetch(`/api/cafes/${cafeId}/music-schedule`).then((x) => x.json()).catch(() => ({})),
      fetch(`/api/cafes/${cafeId}/rush-predictor`).then((x) => x.json()).catch(() => ({})),
      fetch(`/api/cafes/${cafeId}/blind-count`).then((x) => x.json()).catch(() => ({})),
    ]);

    setReferralCode(ref.code ?? "");
    setNotices(n.notices ?? []);
    setIotEvents(i.events ?? []);
    setFreshness(f.items ?? []);
    setBreaks(b.sessions ?? []);
    setCashVariance(cv.reports ?? []);
    setMusic(m.schedules ?? []);
    setRush(r.forecast ?? []);
    setBlind(bl.rows ?? []);
  }

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeId]);

  useCafeRealtime(cafeId, (event) => {
    if (
      event.type === "ops.notice.created" ||
      event.type === "ops.shift_swap.updated" ||
      event.type === "ops.iot.alarm"
    ) {
      void loadAll();
    }
  });

  async function post(url: string, body: unknown) {
    setMsg("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg(data.error ?? "Xatolik");
      return false;
    }
    setMsg("Saqlandi");
    await loadAll();
    return true;
  }

  return (
    <div className="operations-hub space-y-6">
      <header className="rounded-xl border border-[var(--dp-border)] bg-[var(--dp-card)] p-5 shadow-[var(--dp-shadow)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--dp-accent)]">Operatsion markaz</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--dp-text)]">Operations Hub</h1>
        <p className="mt-1 text-sm text-[var(--dp-muted)]">
          Trial, referral, notice, shift swap, IoT, freshness, break, cash variance, music, rush predictor, blind count
        </p>
      </header>

      {msg && <p className="rounded-lg border border-[var(--dp-stat-amber-border)] bg-[var(--dp-accent-soft)] px-3 py-2 text-sm text-[var(--dp-text)]">{msg}</p>}

      <div className="flex flex-wrap gap-2">
        {([
          ["overview", "Overview"],
          ["communication", "E'lonlar"],
          ["operations", "Smena & Kassa"],
          ["safety", "IoT & Ombor"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === id ? "ops-hub-tab-active" : "ops-hub-tab"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {(tab === "overview" || tab === "operations") && (
      <section className="grid gap-4 md:grid-cols-2">
        <Card
          title="Referral"
          helpText="Do'stga referral kod yuborasiz. Kod ishlatilsa, jo'natuvchi va qabul qiluvchi kafe uchun bonus/chegirma mexanizmi ishlaydi."
        >
          <p className="text-sm">Kod: <b>{referralCode || "—"}</b></p>
          <div className="mt-2 flex gap-2">
            <input className="input flex-1" value={applyCode} onChange={(e) => setApplyCode(e.target.value)} placeholder="Referral code" />
            <button className="btn btn-primary" disabled={!canManage} onClick={() => post(`/api/cafes/${cafeId}/referral`, { code: applyCode })}>Qo'llash</button>
          </div>
          {!canManage && <p className="mt-2 text-xs text-[var(--dp-muted)]">Faqat manager/owner boshqaradi.</p>}
        </Card>

        <Card
          title="Rush Predictor"
          helpText="Oldingi haftalar ma'lumotiga qarab eng band soatlarni taxmin qiladi. Smena rejalash va oldindan tayyorgarlik uchun."
        >
          {rush.length === 0 ? <p className="text-sm text-[var(--dp-muted)]">Ma'lumot yo'q</p> : (
            <ul className="space-y-1 text-sm">
              {rush.map((r, i) => (
                <li key={i}>
                  {String((r.hour as number) ?? 0).padStart(2, "0")}:00 — {(r.expectedOrders as number) ?? 0} buyurtma, {(r.expectedItems as number) ?? 0} item
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
      )}

      {(tab === "overview" || tab === "communication") && (
      <section className="grid gap-4 md:grid-cols-2">
        <Card
          title="Notice"
          helpText="Faqat xodimlar (ofitsiant, kassir, oshxona) oynasida chiqadi. Mijoz ilovasida ko'rinmaydi. Ichki chat — sidebar / yuqori paneldagi Chat tugmasi orqali."
        >
          <input className="input w-full" placeholder="Sarlavha" value={noticeTitle} onChange={(e) => setNoticeTitle(e.target.value)} />
          <textarea className="input mt-2 w-full" placeholder="Matn" value={noticeBody} onChange={(e) => setNoticeBody(e.target.value)} />
          <button className="btn btn-primary mt-2" disabled={!canManage} onClick={() => post(`/api/cafes/${cafeId}/notices`, { title: noticeTitle, body: noticeBody, priority: "HIGH", audience: "STAFF" })}>E'lon berish</button>
          {!canManage && <p className="mt-2 text-xs text-[var(--dp-muted)]">Faqat manager/owner e'lon beradi.</p>}
          <ul className="mt-2 space-y-1 text-sm">
            {notices.slice(0, 5).map((n, i) => <li key={i}>• {String(n.title ?? "")}</li>)}
          </ul>
        </Card>
      </section>
      )}

      {(tab === "overview" || tab === "operations") && (
      <section className="grid gap-4 md:grid-cols-2">
        <Card
          title="Smena almashish"
          helpText="Xodimlar smena so'rovi ochadi, boshqalar qabul qiladi yoki rad etadi. Ofitsiant/kassir/oshxona sozlamalarida ham bor."
        >
          <ShiftSwapPanel cafeId={cafeId} userId={userId} compact />
        </Card>

        <Card
          title="IoT Muzlatgich"
          helpText="Muzlatgich datchigidan kelgan haroratni qabul qiladi. Thresholddan oshsa alarm holati qayd qilinadi."
        >
          <button className="btn btn-secondary" onClick={() => post(`/api/cafes/${cafeId}/iot-temperature`, { sensorName: "Freezer-1", temperature: 6.2, threshold: 5 })}>Test signal (alarm)</button>
          <ul className="mt-2 space-y-1 text-sm">
            {iotEvents.slice(0, 6).map((e, i) => (
              <li key={i}>• {String(e.sensorName ?? "")}: {String(e.temperature ?? "")}°C {Boolean(e.isAlarm) ? "🚨" : ""}</li>
            ))}
          </ul>
        </Card>
      </section>
      )}

      {(tab === "overview" || tab === "safety") && (
      <section className="grid gap-4 md:grid-cols-2">
        <Card
          title="Freshness Tracker"
          helpText="Vitrinadagi mahsulotlar muddati nazorati. Tugash vaqti yaqinlashsa yoki o'tsa kuzatish osonlashadi."
        >
          <button className="btn btn-secondary" onClick={() => post(`/api/cafes/${cafeId}/freshness`, { name: "Cheesecake", expiresAt: new Date(Date.now() + 2 * 3600 * 1000).toISOString(), location: "Vitrina" })}>Yangi timer</button>
          <ul className="mt-2 space-y-1 text-sm">
            {freshness.slice(0, 8).map((f, i) => <li key={i}>• {String(f.name ?? "")} — {Boolean(f.isExpired) ? "Muddat o'tgan" : "Faol"}</li>)}
          </ul>
        </Card>

        <Card
          title="Break Time Manager"
          helpText="Xodim tanaffusini boshlash/yakunlashni qayd qiladi. Tanaffus intizomini nazorat qilishga yordam beradi."
        >
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => post(`/api/cafes/${cafeId}/breaks`, { plannedMin: 15 })}>Tanaffus boshlash</button>
            {Boolean(breaks[0]?.id) && (
              <button className="btn btn-secondary" onClick={async () => {
                await fetch(`/api/cafes/${cafeId}/breaks`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: String(breaks[0]?.id ?? "") }) });
                await loadAll();
              }}>Yakunlash</button>
            )}
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {breaks.slice(0, 6).map((b, i) => <li key={i}>• {String(b.userName ?? "")} — {b.endedAt ? "Yakunlangan" : "Jarayonda"}</li>)}
          </ul>
        </Card>
      </section>
      )}

      {(tab === "overview" || tab === "operations") && (
      <section className="grid gap-4 md:grid-cols-2">
        <Card
          title="Cash Variance Tracker"
          helpText="Kutilgan naqd pul va real kassadagi pul farqini qayd qiladi. Farq bo'lsa izoh talab qilinadi."
        >
          <p className="text-sm text-[var(--dp-muted)]">
            Naqd farqni kassir <strong>Kun yopish (Z)</strong> bo&apos;limidan yozadi.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {cashVariance.slice(0, 6).map((r, i) => (
              <li key={i}>• {String(r.shiftLabel ?? "Smena")} — farq {formatPrice((r.variance as number) ?? 0)}</li>
            ))}
          </ul>
        </Card>

        <Card
          title="Cafe Mood & Music"
          helpText="Kunlik yangilanadigan tavsiyalar + yurakcha bilan saralash. Spotify ulanmaydi — faqat nomlar."
        >
          <CafeMusicPanel
            cafeId={cafeId}
            canManage={canManage}
            savedSchedules={music}
            onSaveSchedule={(payload) => {
              void post(`/api/cafes/${cafeId}/music-schedule`, payload);
            }}
          />
        </Card>
      </section>
      )}

      {(tab === "overview" || tab === "safety") && (
      <section>
        <Card
          title="Blind Count"
          helpText="Yuk qabulida xodim ko'r-ko'rona sanaydi. Kutilgan va sanalgan miqdor solishtirilib mismatch aniqlanadi."
        >
          <button className="btn btn-secondary" onClick={() => post(`/api/cafes/${cafeId}/blind-count`, { itemName: "Sut", expectedQty: 20, countedQty: 18, mismatchReason: "2 dona kam" })}>Blind count yozish</button>
          <ul className="mt-2 space-y-1 text-sm">
            {blind.slice(0, 8).map((b, i) => <li key={i}>• {String(b.itemName ?? "")}: {String(b.countedQty ?? 0)}/{String(b.expectedQty ?? 0)} — {String(b.status ?? "")}</li>)}
          </ul>
        </Card>
      </section>
      )}
    </div>
  );
}

function Card({
  title,
  helpText,
  children,
}: {
  title: string;
  helpText?: string;
  children: React.ReactNode;
}) {
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showHelp) return;
    function onDocClick(e: MouseEvent) {
      if (!helpRef.current) return;
      if (!helpRef.current.contains(e.target as Node)) {
        setShowHelp(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setShowHelp(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [showHelp]);

  return (
    <section className="ops-hub-card rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-bold text-[var(--dp-text)]">{title}</h2>
        {helpText && (
          <div className="relative" ref={helpRef}>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--dp-border)] text-xs font-bold text-[var(--dp-muted)] hover:bg-[var(--dp-accent-soft)] hover:text-[var(--dp-accent)]"
              title="Bu bo'lim nima qiladi?"
              aria-expanded={showHelp}
              aria-label={`${title} yordam`}
            >
              ?
            </button>
            <div
              className={`absolute right-0 top-8 z-20 w-72 origin-top-right rounded-lg border border-[var(--dp-border)] bg-[var(--dp-card)] p-3 text-xs text-[var(--dp-muted)] shadow-xl transition-all duration-150 ${
                showHelp
                  ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none -translate-y-1 scale-95 opacity-0"
              }`}
            >
              <p className="leading-relaxed">{helpText}</p>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
