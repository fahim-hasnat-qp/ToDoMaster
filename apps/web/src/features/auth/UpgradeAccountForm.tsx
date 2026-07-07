import { useState, type FormEvent } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Field } from '@/components/Field';
import { useToastStore } from '@/stores/toast-store';
import { useAuthStore } from './auth-store';

/** Embedded in Settings for guest users — attaches real credentials in place. */
export function UpgradeAccountForm() {
  const upgradeGuest = useAuthStore((s) => s.upgradeGuest);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const showToast = useToastStore((s) => s.show);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await upgradeGuest({ email, password, displayName });
      showToast({ message: 'Account created — check your email to verify it.' });
    } catch (err) {
      setError(
        err instanceof Error && err.message.toLowerCase().includes('already')
          ? 'That email is already registered.'
          : 'Could not create your account.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field label="Name">
        <Input required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}
