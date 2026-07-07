import { useEffect, type ReactNode } from "react";
import { resolveTheme, useSettingsStore } from "@/stores/settings-store";

/**
 * Applies theme + accent to the document root by toggling data-attributes that
 * the token CSS keys off. Also reacts to OS theme changes when 'system'.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSettingsStore((s) => s.theme);
  const accent = useSettingsStore((s) => s.accent);

  useEffect(() => {
    const root = document.documentElement;
    const apply = () => root.setAttribute("data-theme", resolveTheme("test"));
    apply();

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-accent", accent);
  }, [accent]);

  return <>{children}</>;
}
