export const THEME_STORAGE_KEY = "theme";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const DEFAULT_THEME: Theme = "dark";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

/** Server-side: system tanlangan bo‘lsa default dark (client keyin tuzatadi). */
export function resolveThemeForSSR(preference: string | undefined): ResolvedTheme {
  if (preference === "light") return "light";
  return "dark";
}

export function persistThemePreference(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore
  }
  document.cookie = `${THEME_STORAGE_KEY}=${theme};path=/;max-age=${ONE_YEAR_SECONDS};SameSite=Lax`;
}

export function readStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(raw ?? undefined)) return raw as Theme;
  } catch {
    // ignore
  }
  return DEFAULT_THEME;
}
