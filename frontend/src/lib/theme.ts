export const THEME_KEY = "meetingmind_theme";
export type Theme = "light" | "dark";

/** Inline script run in <head> before first paint to prevent a theme flash. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})();`;

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  // Enable smooth colour transition only while switching, never on first paint.
  root.classList.add("theme-transition");
  root.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new CustomEvent("meetingmind-theme", { detail: theme }));
  window.setTimeout(() => root.classList.remove("theme-transition"), 350);
}
