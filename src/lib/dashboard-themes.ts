import { DashboardTheme } from "@prisma/client";

export type DashboardThemeId = DashboardTheme;

export type DashboardThemeMeta = {
  id: DashboardThemeId;
  label: string;
  description: string;
  swatches: [string, string, string];
};

export const DASHBOARD_THEMES: DashboardThemeMeta[] = [
  {
    id: "CLASSIC",
    label: "Klassik",
    description: "Iliq jigarrang sidebar, oq kartalar",
    swatches: ["#5a5248", "#cfc6b8", "#ffffff"],
  },
  {
    id: "MODERN",
    label: "Zamonaviy",
    description: "Ko'k-kulrang fon, oq kartalar",
    swatches: ["#2d3a4f", "#b4c0d4", "#ffffff"],
  },
  {
    id: "PREMIUM",
    label: "Premium",
    description: "Espresso sidebar, oltin aksent",
    swatches: ["#2a231c", "#d9cfbe", "#ffffff"],
  },
];

export function dashboardThemeMeta(id: DashboardThemeId): DashboardThemeMeta {
  return DASHBOARD_THEMES.find((t) => t.id === id) ?? DASHBOARD_THEMES[0];
}

export function dashboardThemeClass(id: DashboardThemeId): string {
  return id.toLowerCase();
}

/** Panel rangini darhol yangilash (sidebar va sozlamalar uchun). */
export function applyDashboardThemeLive(id: DashboardThemeId) {
  if (typeof document === "undefined") return;
  document
    .querySelector(".dashboard-panel")
    ?.setAttribute("data-dp-theme", dashboardThemeClass(id));
}
