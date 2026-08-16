import { requirePlatformMenu } from "@/lib/session-guard";
import { PlatformShoppingAdmin } from "@/components/platform-shopping-admin";

export default async function PlatformShoppingDiscountsPage() {
  await requirePlatformMenu("menu.shopping");
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Chegirmalar</h1>
      <p className="mt-1 text-stone-500">
        Foiz / summa chegirmalar va promo kodlar
      </p>
      <div className="mt-6">
        <PlatformShoppingAdmin initialTab="discounts" />
      </div>
    </div>
  );
}
