import { requireSuperAdmin } from "@/lib/session-guard";
import { listPlatformStaff } from "@/lib/platform-staff";
import { PlatformStaffManager } from "@/components/platform-staff-manager";

export default async function PlatformStaffPage() {
  await requireSuperAdmin();
  const staff = await listPlatformStaff();

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Xodimlar</h1>
      <p className="mt-1 text-stone-500">
        Yordamchilarga menyu va amallar ruxsatlarini tanlab bering
      </p>
      <div className="mt-8">
        <PlatformStaffManager initial={staff} />
      </div>
    </div>
  );
}
