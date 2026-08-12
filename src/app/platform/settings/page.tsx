import { requirePlatformMenu } from "@/lib/session-guard";
import { PlatformSettingsPageClient } from "./settings-client";

export default async function PlatformSettingsPage() {
  await requirePlatformMenu("menu.settings");
  return <PlatformSettingsPageClient />;
}
