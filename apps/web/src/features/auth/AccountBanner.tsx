import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, UserPlus, X } from 'lucide-react';
import { useAuthStore } from './auth-store';
import { authApi } from './auth-api';
import { useToastStore } from '@/stores/toast-store';

/**
 * Soft-gate banner: unverified accounts and guests get a dismissible nudge,
 * never a block. Dismissal is per-session (not persisted) — reappears next
 * launch as a gentle reminder, not nagware that needs re-dismissing every scroll.
 */
export function AccountBanner() {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);
  const showToast = useToastStore((s) => s.show);

  if (!user || dismissed) return null;

  const isGuest = user.email === null;
  if (!isGuest && user.emailVerified) return null;

  const resend = async () => {
    if (!user.email) return;
    await authApi.resendVerification(user.email);
    showToast({ message: 'Verification email sent.' });
  };

  return (
    <div className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-2 text-sm">
      {isGuest ? (
        <>
          <UserPlus className="h-4 w-4 shrink-0 text-accent" />
          <span className="flex-1 text-text">
            You&apos;re using a guest account — your tasks are local to this device only.
          </span>
          <Link to="/register" className="font-medium text-accent hover:underline">
            Create an account
          </Link>
        </>
      ) : (
        <>
          <Mail className="h-4 w-4 shrink-0 text-accent" />
          <span className="flex-1 text-text">Please verify your email address.</span>
          <button onClick={() => void resend()} className="font-medium text-accent hover:underline">
            Resend email
          </button>
        </>
      )}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted hover:bg-surface"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
