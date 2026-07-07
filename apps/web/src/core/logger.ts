import { config } from './config';

/**
 * Pluggable logger. Console in dev; in prod we keep warn/error and can attach a
 * remote sink later without touching call sites (Dependency Inversion).
 */
export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, error?: unknown, meta?: Record<string, unknown>): void;
}

class ConsoleLogger implements Logger {
  debug(msg: string, meta?: Record<string, unknown>) {
    if (config.isDev) console.debug(`[debug] ${msg}`, meta ?? '');
  }
  info(msg: string, meta?: Record<string, unknown>) {
    console.info(`[info] ${msg}`, meta ?? '');
  }
  warn(msg: string, meta?: Record<string, unknown>) {
    console.warn(`[warn] ${msg}`, meta ?? '');
  }
  error(msg: string, error?: unknown, meta?: Record<string, unknown>) {
    console.error(`[error] ${msg}`, error ?? '', meta ?? '');
  }
}

export const logger: Logger = new ConsoleLogger();
