import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Field } from '@/components/Field';
import { authApi } from './auth-api';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await authApi.requestPasswordReset(email);
    } finally {
      // Always show the same confirmation regardless of outcome — the API
      // itself is anti-enumeration (see AuthService.requestPasswordReset),
      // and the UI shouldn't undo that by branching on success/failure here.
      setSent(true);
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout title="Check your email">
        <p className="text-center text-sm text-muted">
          If an account exists for <span className="text-text">{email}</span>, we&apos;ve sent a
          password reset link.
        </p>
        <Link to="/login" className="mt-5 block text-center text-sm text-accent hover:underline">
          Back to login
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a reset link">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full justify-center" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
      <Link to="/login" className="mt-5 block text-center text-sm text-accent hover:underline">
        Back to login
      </Link>
    </AuthLayout>
  );
}
