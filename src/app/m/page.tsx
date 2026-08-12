"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Bike, ShoppingBag, UserRound } from "lucide-react";
import { NooklineMark } from "@/components/nookline-mark";

const SLUG_KEY = "nookline-mobile-cafe-slug";
const ROLE_KEY = "nookline-mobile-role";

type Role = "customer" | "courier" | "waiter";

function MobileHubInner() {
  const router = useRouter();
  const search = useSearchParams();
  const slugFromQuery = (search.get("cafe") || search.get("slug") || "").trim();
  const [slug, setSlug] = useState(slugFromQuery);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const forcePick = search.get("pick") === "1";
    if (forcePick) {
      localStorage.removeItem(ROLE_KEY);
    }
    const savedSlug = slugFromQuery || localStorage.getItem(SLUG_KEY) || "";
    const savedRole = localStorage.getItem(ROLE_KEY) as Role | null;
    if (savedSlug) setSlug(savedSlug);

    if (!forcePick) {
      if (savedSlug && savedRole === "customer") {
        router.replace(`/c/${savedSlug}/app`);
        return;
      }
      if (savedSlug && savedRole === "courier") {
        router.replace(`/c/${savedSlug}/app?mode=courier`);
        return;
      }
      if (savedRole === "waiter") {
        router.replace("/login?for=staff");
        return;
      }
    }
    setReady(true);
  }, [router, slugFromQuery, search]);

  const cafeApp = useMemo(() => {
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    return s ? `/c/${s}/app` : null;
  }, [slug]);

  function go(role: Role) {
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (role !== "waiter" && !s) {
      alert("Kafe slugini kiriting (masalan: demo-kafe)");
      return;
    }
    if (s) localStorage.setItem(SLUG_KEY, s);
    localStorage.setItem(ROLE_KEY, role);

    if (role === "customer") router.push(`/c/${s}/app`);
    else if (role === "courier") router.push(`/c/${s}/app?mode=courier`);
    else router.push("/login?for=staff");
  }

  if (!ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0b10] text-white">
        <p className="text-sm text-white/60">Yuklanmoqda…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#0a0b10] px-5 pb-8 pt-12 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-[#16A398]/25 blur-[90px]" />
        <div className="absolute -right-16 bottom-1/3 h-56 w-56 rounded-full bg-[#E85A2A]/12 blur-[80px]" />
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 h-20 w-20 overflow-hidden rounded-[1.75rem] shadow-lg ring-1 ring-white/10">
            <NooklineMark size={80} className="!h-full !w-full rounded-[1.75rem]" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Nookline</h1>
          <p className="mt-1 text-center text-sm text-white/55">
            Onlayn buyurtma · Kuryer · Ofitsiant
          </p>
        </div>

        <label className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/45">
          Kafe slug (mijoz / kuryer)
        </label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="demo-kafe"
          className="mb-5 w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm outline-none ring-[#16A398]/40 placeholder:text-white/30 focus:ring-2"
        />

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => go("customer")}
            className="flex items-center gap-3 rounded-2xl bg-[#16A398] px-4 py-4 text-left font-bold shadow-lg shadow-teal-900/30"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base">Mijoz — onlayn buyurtma</span>
              <span className="block text-xs font-normal text-white/80">
                Taom buyurtma, yetkazish / olib ketish
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => go("courier")}
            className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-left font-bold"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
              <Bike className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base">Kuryer</span>
              <span className="block text-xs font-normal text-white/55">
                Yetkazish buyurtmalari
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => go("waiter")}
            className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-left font-bold"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
              <UserRound className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-base">Ofitsiant / kassa</span>
              <span className="block text-xs font-normal text-white/55">
                Xodim login (email + parol)
              </span>
            </span>
          </button>
        </div>

        {cafeApp && (
          <p className="mt-4 text-center text-[11px] text-white/35">
            Mijoz yo‘li: {cafeApp}
          </p>
        )}

        <p className="mt-auto pt-8 text-center text-xs text-white/30">
          <Link href="/" className="hover:text-white/50">
            Platforma sayti
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function MobileHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-[#0a0b10] text-sm text-white/60">
          Yuklanmoqda…
        </div>
      }
    >
      <MobileHubInner />
    </Suspense>
  );
}
