import { requirePlatformMenu } from "@/lib/session-guard";
import { PlatformShoppingAdmin } from "@/components/platform-shopping-admin";

export default async function PlatformShoppingProductsPage() {
  await requirePlatformMenu("menu.shopping");
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Mahsulotlar</h1>
      <p className="mt-1 text-stone-500">
        Tovarlar, narxlar, ombor qoldig‘i va sotuv holati
      </p>
      <div className="mt-6">
        <PlatformShoppingAdmin initialTab="products" />
      </div>
    </div>
  );
}
