import { requirePlatformMenu } from "@/lib/session-guard";
import { PlatformShoppingOrders } from "@/components/platform-shopping-orders";

export default async function PlatformShoppingOrdersPage() {
  await requirePlatformMenu("menu.shopping");
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Buyurtmalar</h1>
      <p className="mt-1 text-stone-500">
        Onlayn do‘kon (/shop) dan kelgan buyurtmalar. Yangi buyurtma kelganda
        Telegramga ham xabar ketadi (
        <code className="rounded bg-stone-100 px-1 text-xs">
          PLATFORM_SUPPORT_TELEGRAM_CHAT_ID
        </code>
        ).
      </p>
      <div className="mt-6">
        <PlatformShoppingOrders />
      </div>
    </div>
  );
}
