import { logger } from './logger';

/**
 * Thin wrapper over the browser Notification API.
 *
 * IMPORTANT LIMITATION (documented, not silently papered over): this schedules
 * notifications via in-memory timers, which only fire while this tab/app is
 * open. There is no background push here — that requires a server-side Web
 * Push implementation (VAPID keys, a push subscription per device, a backend
 * endpoint to trigger sends), which belongs with the Backend/Sync milestone.
 * Until then, reminders are "best effort while the app is running", which is
 * still useful (the app re-scans on load and periodically) but is NOT a
 * substitute for real push notifications on mobile when the app is closed.
 */
export interface NotificationService {
  isSupported(): boolean;
  permission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  notify(title: string, options?: NotificationOptions): void;
}

class BrowserNotificationService implements NotificationService {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  permission(): NotificationPermission {
    return this.isSupported() ? Notification.permission : 'denied';
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    if (Notification.permission !== 'default') return Notification.permission;
    try {
      return await Notification.requestPermission();
    } catch (error) {
      logger.error('Notification permission request failed', error);
      return 'denied';
    }
  }

  notify(title: string, options?: NotificationOptions): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return;
    try {
      new Notification(title, options);
    } catch (error) {
      logger.error('Failed to show notification', error);
    }
  }
}

export const notificationService: NotificationService = new BrowserNotificationService();
