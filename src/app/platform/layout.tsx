import type { Metadata, Viewport } from "next";
import { requirePlatformAccess } from "@/lib/session-guard";
import { getPlatformAccessPermissions } from "@/lib/platform-permissions-server";
import { getPlatformSettings } from "@/lib/platform-settings";
import { PlatformShell } from "@/components/platform-shell";

export const metadata: Metadata = {
  title: "Nookline Platforma",
  manifest: "/platform.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Nookline Platforma",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icons/icon-platform.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/icon-platform.svg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7c3aed" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0c16" },
  ],
};

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePlatformAccess();
  const platform = getPlatformSettings();
  const permissions = await getPlatformAccessPermissions(session);

  return (
    <PlatformShell
      companyName={platform.companyName}
      userName={session.name}
      userEmail={session.email}
      permissions={permissions}
    >
      {children}
    </PlatformShell>
  );
}
