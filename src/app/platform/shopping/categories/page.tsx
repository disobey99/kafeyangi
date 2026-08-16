import { requirePlatformMenu } from "@/lib/session-guard";
import { PlatformShoppingAdmin } from "@/components/platform-shopping-admin";

export default async function PlatformShoppingCategoriesPage() {
  await requirePlatformMenu("menu.shopping");
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Kategoriyalar</h1>
      <p className="mt-1 text-stone-500">Onlayn do‘kon bo‘limlari</p>
      <div className="mt-6">
        <PlatformShoppingAdmin initialTab="categories" />
      </div>
    </div>
  );
}
