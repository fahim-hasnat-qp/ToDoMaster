import { useEffect, useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Field, Fieldset } from '@/components/Field';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { cn } from '@/components/utils/cn';
import { notificationService } from '@/core/notifications';
import { useSettingsStore, type Accent, type Theme } from '@/stores/settings-store';
import { useAuthStore } from '@/features/auth/auth-store';
import { UpgradeAccountForm } from '@/features/auth/UpgradeAccountForm';
import { authApi } from '@/features/auth/auth-api';
import { useToastStore } from '@/stores/toast-store';

const THEME_OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/** Hex previews matching the --c-accent values in styles/tokens.css. */
const ACCENT_OPTIONS: ReadonlyArray<{ value: Accent; label: string; hex: string }> = [
  { value: 'blue', label: 'Blue', hex: '#6C8EF5' },
  { value: 'violet', label: 'Violet', hex: '#9B6EF5' },
  { value: 'emerald', label: 'Emerald', hex: '#2DC58A' },
  { value: 'rose', label: 'Rose', hex: '#F45E81' },
  { value: 'amber', label: 'Amber', hex: '#F59E42' },
];

/**
 * Settings screen: appearance (theme/accent), account, and notifications.
 * This is the seam the full Settings milestone (backup/restore/export/import)
 * extends — same screen, more sections — not a throwaway placeholder.
 */
export function SettingsScreen() {
  const dailySummaryTime = useSettingsStore((s) => s.dailySummaryTime);
  const setDailySummaryTime = useSettingsStore((s) => s.setDailySummaryTime);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const accent = useSettingsStore((s) => s.accent);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const [permission, setPermission] = useState(notificationService.permission());

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.show);
  const isGuest = user?.email === null;

  useEffect(() => {
    // Permission can change in another tab/via browser UI; re-check on focus.
    const onFocus = () => setPermission(notificationService.permission());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const requestPermission = async () => {
    const result = await notificationService.requestPermission();
    setPermission(result);
  };

  const resendVerification = async () => {
    if (!user?.email) return;
    await authApi.resendVerification(user.email);
    showToast({ message: 'Verification email sent.' });
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="mb-5 text-2xl font-bold text-text">Settings</h1>

      <section className="mb-4 space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-text">Appearance</h2>

        <Fieldset label="Theme">
          {THEME_OPTIONS.map((opt) => (
            <Chip key={opt.value} active={theme === opt.value} onClick={() => setTheme(opt.value)}>
              {opt.label}
            </Chip>
          ))}
        </Fieldset>

        <Fieldset label="Accent color">
          {ACCENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-label={opt.label}
              aria-pressed={accent === opt.value}
              onClick={() => setAccent(opt.value)}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-full transition-transform',
                accent === opt.value ? 'scale-110' : 'hover:scale-105',
              )}
              style={{
                backgroundColor: opt.hex,
                boxShadow:
                  accent === opt.value
                    ? `0 0 0 2px rgb(var(--c-surface)), 0 0 0 4px ${opt.hex}`
                    : undefined,
              }}
            >
              {accent === opt.value && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </Fieldset>
      </section>

      <section className="mb-4 space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-text">Account</h2>

        {isGuest ? (
          <>
            <p className="text-sm text-muted">
              You&apos;re using a guest account. Create an account to sync your tasks across
              devices.
            </p>
            <UpgradeAccountForm />
          </>
        ) : (
          <>
            <div className="text-sm">
              <p className="text-text">{user?.displayName}</p>
              <p className="text-muted">{user?.email}</p>
            </div>
            {!user?.emailVerified && (
              <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
                <span className="flex-1 text-muted">Your email isn&apos;t verified yet.</span>
                <button
                  onClick={() => void resendVerification()}
                  className="font-medium text-accent hover:underline"
                >
                  Resend
                </button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              Log out
            </Button>
          </>
        )}
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-text">Notifications</h2>

        <div className="flex items-center gap-3">
          {permission === 'granted' ? (
            <Bell className="h-4 w-4 text-accent" />
          ) : (
            <BellOff className="h-4 w-4 text-muted" />
          )}
          <span className="flex-1 text-sm text-muted">
            {permission === 'granted' && 'Reminders and daily summaries are enabled.'}
            {permission === 'denied' &&
              'Notifications are blocked. Enable them in your browser settings to receive reminders.'}
            {permission === 'default' && 'Allow notifications to receive task reminders.'}
          </span>
          {permission === 'default' && (
            <Button size="sm" onClick={() => void requestPermission()}>
              Enable
            </Button>
          )}
        </div>

        <Field label="Daily summary time">
          <div className="flex items-center gap-2">
            <Input
              type="time"
              value={dailySummaryTime ?? ''}
              onChange={(e) => setDailySummaryTime(e.target.value || null)}
              className="max-w-[10rem]"
            />
            {dailySummaryTime && (
              <Button variant="ghost" size="sm" onClick={() => setDailySummaryTime(null)}>
                Turn off
              </Button>
            )}
          </div>
        </Field>
        <p className="text-xs text-muted">
          Get a notification each day summarizing what&apos;s due. Only fires while the app is
          open in a tab — see the Reminders feature notes for why.
        </p>
      </section>
    </div>
  );
}
