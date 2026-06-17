export const ADMIN_THEME_STORAGE_KEY = "admin-theme";

export type AdminTheme = "light" | "dark" | "xp";

export const ADMIN_THEMES: AdminTheme[] = ["light", "dark", "xp"];

export const ADMIN_THEME_LABELS: Record<AdminTheme, string> = {
  light: "Светлая",
  dark: "Тёмная",
  xp: "Windows XP",
};

export function isAdminTheme(value: string | null | undefined): value is AdminTheme {
  return value === "light" || value === "dark" || value === "xp";
}

export function readStoredAdminTheme(): AdminTheme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
    return isAdminTheme(stored) ? stored : "light";
  } catch {
    return "light";
  }
}

export function writeStoredAdminTheme(theme: AdminTheme) {
  try {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}

export function applyAdminThemeToDocument(theme: AdminTheme) {
  const root = document.querySelector(".admin-panel");
  if (root instanceof HTMLElement) {
    root.dataset.adminTheme = theme;
  }
}
