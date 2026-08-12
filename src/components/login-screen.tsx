import Link from "next/link";
import { Sparkles } from "lucide-react";
import { NooklineMark } from "@/components/nookline-mark";

type LoginScreenProps = {
  children: React.ReactNode;
  /** Ofitsiant / kassa APK — kafe egasi ro‘yxatini yashirish */
  staffOnly?: boolean;
};

export function LoginScreen({ children, staffOnly = false }: LoginScreenProps) {
  return (
    <div className="login-screen relative flex min-h-screen flex-col overflow-hidden bg-[#0a0b10] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#16A398]/25 blur-[100px]" />
        <div className="absolute -right-16 bottom-1/4 h-64 w-64 rounded-full bg-[#E85A2A]/12 blur-[90px]" />
        <div className="absolute left-1/2 top-1/3 h-40 w-40 -translate-x-1/2 rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      <div className="relative z-[1] mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-14">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 scale-125 rounded-[2.25rem] bg-[#16A398]/35 blur-2xl" />
            <div className="relative h-24 w-24 overflow-hidden rounded-[2rem] shadow-[0_12px_40px_rgba(22,163,152,0.45)] ring-1 ring-white/10">
              <NooklineMark size={96} className="!h-full !w-full rounded-[2rem]" />
            </div>
          </div>

          <h1 className="text-center text-3xl font-extrabold tracking-tight text-white">
            Nookline
          </h1>
          <p className="mt-2 text-center text-sm text-white/55">
            {staffOnly
              ? "Ofitsiant / kassa — email va parol bilan kiring"
              : "Kafe boshqaruv va xodim paneliga kiring"}
          </p>

          <div className="login-form mt-10 w-full">{children}</div>

          {staffOnly ? (
            <Link
              href="/m?pick=1"
              className="mt-4 flex h-14 w-full items-center justify-center rounded-full border border-white/25 bg-transparent text-base font-semibold text-white transition hover:border-white/45 hover:bg-white/5"
            >
              ← Mijoz / kuryer tanlash
            </Link>
          ) : (
            <Link
              href="/register"
              className="mt-4 flex h-14 w-full items-center justify-center rounded-full border border-white/25 bg-transparent text-base font-semibold text-white transition hover:border-white/45 hover:bg-white/5"
            >
              Kafe ochish (biznes egasi)
            </Link>
          )}
        </div>

        {!staffOnly && (
          <div className="relative mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-[#16A398] to-[#0e7d74] p-5 shadow-[0_16px_48px_rgba(22,163,152,0.35)]">
            <div className="relative z-10 max-w-[58%] pr-2">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#E85A2A]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <Sparkles className="h-3 w-3" />
                Bepul sinov
              </div>
              <p className="text-lg font-bold leading-snug text-white">
                14 kun bepul — QR menyu va kassa bilan
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                Buyurtmalar, oshxona va hisobotlar bitta tizimda
              </p>
            </div>
            <div className="absolute -bottom-3 -right-3 h-28 w-28 overflow-hidden rounded-full border-4 border-white/20 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&h=200&fit=crop"
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/30">
          © Nookline ·{" "}
          <Link href={staffOnly ? "/m?pick=1" : "/"} className="transition hover:text-white/50">
            {staffOnly ? "Ilova bosh sahifasi" : "Bosh sahifa"}
          </Link>
        </p>
      </div>
    </div>
  );
}
