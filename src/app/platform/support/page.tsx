import { Suspense } from "react";
import { requirePlatformMenu } from "@/lib/session-guard";
import { PlatformSupportInbox } from "@/components/platform-support-inbox";

export default async function PlatformSupportPage() {
  await requirePlatformMenu("menu.support");

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Qo&apos;llab-quvvatlash chat</h1>
      <p className="mt-1 text-stone-500">
        Mijozlar bilan tizim ichida yozishmalar — mijoz o&apos;qiganda ikki galochka
      </p>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-stone-500">Yuklanmoqda…</p>}>
          <PlatformSupportInbox />
        </Suspense>
      </div>
    </div>
  );
}
