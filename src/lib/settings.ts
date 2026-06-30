// Lightweight settings stored in localStorage.
export interface AppSettings {
  theme: "light" | "dark";
  defaultFilter: string;
  autoOcr: boolean;
  pdfQuality: number; // 0..1
}
const KEY = "scanner.settings.v1";
const DEFAULTS: AppSettings = {
  theme: "light",
  defaultFilter: "autoEnhance",
  autoOcr: false,
  pdfQuality: 0.85,
};
export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return DEFAULTS;
  }
}
export function setSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  applyTheme(s.theme);
}
export function applyTheme(theme: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}
