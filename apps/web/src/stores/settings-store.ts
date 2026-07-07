import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type Accent = 'blue' | 'violet' | 'emerald' | 'rose' | 'amber';

interface SettingsState {
  theme: Theme;
  accent: Accent;
  /** Daily summary notification, "HH:mm" 24h local time. Null = disabled. */
  dailySummaryTime: string | null;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  setDailySummaryTime: (time: string | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'system',
      accent: 'blue',
      dailySummaryTime: null,
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setDailySummaryTime: (dailySummaryTime) => set({ dailySummaryTime }),
    }),
    { name: 'todomaster.settings' },
  ),
);

/** Resolve 'system' to the concrete theme using the OS preference. */
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}
