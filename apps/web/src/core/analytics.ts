import { logger } from './logger';

/**
 * Analytics seam. No-op sink by default so we can sprinkle `track()` calls now
 * and wire a real provider (PostHog/Amplitude) later with zero call-site changes.
 */
export interface Analytics {
  track(event: string, props?: Record<string, unknown>): void;
}

class NoopAnalytics implements Analytics {
  track(event: string, props?: Record<string, unknown>) {
    logger.debug(`analytics: ${event}`, props);
  }
}

export const analytics: Analytics = new NoopAnalytics();
