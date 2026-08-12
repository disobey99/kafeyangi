"use client";

import { Download } from "lucide-react";

/**
 * Kafe sayti / subdomen — «Ilovani yuklab olish» (APK).
 * NEXT_PUBLIC_CUSTOMER_APK_URL yoki /downloads/nookline-mijoz.apk
 */
export function InstallAppButton({
  href,
  label,
  color,
  className = "",
  buttonClassName,
  hideHint = false,
  apkUrl,
}: {
  href: string;
  label: string;
  color: string;
  className?: string;
  buttonClassName?: string;
  hideHint?: boolean;
  /** To‘g‘ridan APK havolasi (bo‘lmasa env / default) */
  apkUrl?: string;
}) {
  const resolvedApk =
    apkUrl ||
    (typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_CUSTOMER_APK_URL
      : undefined) ||
    "/downloads/nookline-mijoz.apk";

  function onClick() {
    // Avval APK — PWA o‘rniga haqiqiy ilova
    window.location.href = resolvedApk;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        className={
          buttonClassName ||
          "flex w-full items-center justify-center gap-2 rounded-xl py-4 text-sm font-extrabold text-white shadow-sm"
        }
        style={buttonClassName ? undefined : { backgroundColor: color }}
      >
        <Download className="h-4 w-4" />
        {label}
      </button>
      {!hideHint ? (
        <p className="mt-2 text-center text-[11px] text-stone-400">
          Android APK ·{" "}
          <a href={href} className="font-semibold underline-offset-2 hover:underline">
            Brauzerda ochish
          </a>
        </p>
      ) : null}
    </div>
  );
}
