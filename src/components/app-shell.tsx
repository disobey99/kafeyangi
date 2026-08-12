"use client";

import { OfflineBanner } from "@/components/offline-banner";
import { PwaRegister } from "@/components/pwa-register";

export function AppShell() {
  return (
    <>
      <OfflineBanner />
      <PwaRegister />
    </>
  );
}
