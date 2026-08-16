import { requirePlatformMenu } from "@/lib/session-guard";
import { PlatformShoppingStock } from "@/components/platform-shopping-stock";

export default async function PlatformShoppingStockPage() {
  await requirePlatformMenu("menu.shopping");
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Ombor</h1>
      <p className="mt-1 text-stone-500">
        Kirim, chiqim, qoldiq chegarasi va harakatlar jurnali. Sotuv / bekor
        avtomatik yoziladi.
      </p>
      <div className="mt-6">
        <PlatformShoppingStock />
      </div>
    </div>
  );
}
