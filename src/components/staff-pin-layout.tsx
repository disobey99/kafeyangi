"use client";

import { StaffPinGuard } from "@/components/staff-pin-guard";
import { StaffNoticesBanner } from "@/components/staff-notices-banner";
import { WalkieTalkieWidget } from "@/components/walkie-talkie-widget";
import { SessionWatchdog } from "@/components/session-watchdog";
import { useHardwareBackGuard } from "@/hooks/use-hardware-back";

type WalkieUser = {
  userId: string;
  userName: string;
  userRole: string;
};

/** Chat pastki menyuda; ratsiya — alohida FAB (yuqori panelda emas) */
export function StaffPinLayout({
  cafeId,
  children,
  walkieUser,
}: {
  cafeId: string;
  children: React.ReactNode;
  walkieUser?: WalkieUser;
}) {
  useHardwareBackGuard({
    enabled: true,
    confirmLeave:
      "Tizimdan chiqmoqchimisiz?\n\nHa — login sahifasiga o'tish\nBekor — ish oynasida qolish",
  });

  return (
    <StaffPinGuard cafeId={cafeId}>
      <div className="flex min-h-0 w-full flex-1 flex-col">
        <SessionWatchdog />
        <StaffNoticesBanner cafeId={cafeId} />
        {children}
        {walkieUser && (
          <WalkieTalkieWidget
            cafeId={cafeId}
            userId={walkieUser.userId}
            userName={walkieUser.userName}
            userRole={walkieUser.userRole}
            variant="fab"
          />
        )}
      </div>
    </StaffPinGuard>
  );
}
