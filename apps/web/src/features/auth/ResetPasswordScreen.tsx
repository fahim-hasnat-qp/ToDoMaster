import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Field } from '@/components/Field';
import { authApi } from './auth-api';
import { AuthLayout } from './AuthLayout';

export function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('This reset link is missing its token.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login');
    } catch {
      setError('This reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="New password">
          <Input
            type="password"
            autoFocus
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full justify-center" disabled={submitting}>
          {submitting ? 'Saving…' : 'Reset password'}
        </Button>
      </form>
      <Link to="/login" className="mt-5 block text-center text-sm text-accent hover:underline">
        Back to login
      </Link>
    </AuthLayout>
  );
}
