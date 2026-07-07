/** Runtime config, sourced from Vite env with safe defaults. */
export interface AppConfig {
  apiBaseUrl: string;
  syncIntervalMs: number;
  isDev: boolean;
}

export const config: AppConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  syncIntervalMs: Number(import.meta.env.VITE_SYNC_INTERVAL_MS ?? 30_000),
  isDev: import.meta.env.DEV,
};
