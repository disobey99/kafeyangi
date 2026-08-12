import Link from "next/link";
import { AlertTriangle, UtensilsCrossed } from "lucide-react";

type MenuSetupBannerProps = {
  cafeId: string;
  productCount: number;
  variant?: "default" | "compact";
};

export function MenuSetupBanner({
  cafeId,
  productCount,
  variant = "default",
}: MenuSetupBannerProps) {
  if (productCount > 0) return null;

  if (variant === "compact") {
    return (
      <div
        className="flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs"
        style={{
          borderColor: "rgba(245, 158, 11, 0.35)",
          background: "rgba(245, 158, 11, 0.1)",
          color: "var(--dp-subtle)",
        }}
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>
          Menyu bo&apos;sh —{" "}
          <Link
            href={`/dashboard/${cafeId}/menu`}
            className="font-semibold text-amber-700 underline-offset-2 hover:underline dark:text-amber-300"
          >
            taom qo&apos;shing
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border px-5 py-4"
      style={{
        borderColor: "rgba(245, 158, 11, 0.4)",
        background: "rgba(245, 158, 11, 0.1)",
      }}
    >
      <div className="flex flex-wrap items-start gap-4">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400"
        >
          <AlertTriangle className="h-5 w-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[var(--dp-text)]">Menyu hali sozlanmagan</p>
          <p className="mt-1 text-sm text-[var(--dp-muted)]">
            Kassada va mijoz menyusida buyurtma qabul qilish uchun avval kamida bitta taom
            qo&apos;shishingiz kerak. Hozir menyu bo&apos;sh — buyurtmalar kelmaydi.
          </p>
          <Link
            href={`/dashboard/${cafeId}/menu`}
            className="btn btn-primary mt-3 inline-flex gap-2 text-sm"
          >
            <UtensilsCrossed className="h-4 w-4" />
            Menyuni sozlash
          </Link>
        </div>
      </div>
    </div>
  );
}
