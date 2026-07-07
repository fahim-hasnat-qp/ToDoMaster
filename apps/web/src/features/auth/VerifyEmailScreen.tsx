import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { authApi } from './auth-api';
import { useAuthStore } from './auth-store';
import { AuthLayout } from './AuthLayout';

type Status = 'verifying' | 'success' | 'error';

export function VerifyEmailScreen() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const markEmailVerified = useAuthStore((s) => s.markEmailVerified);
  const [status, setStatus] = useState<Status>('verifying');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    let active = true;
    authApi
      .verifyEmail(token)
      .then(() => {
        if (!active) return;
        markEmailVerified();
        setStatus('success');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [token, markEmailVerified]);

  return (
    <AuthLayout title="Email verification">
      <div className="flex flex-col items-center gap-4 text-center">
        {status === 'verifying' && <p className="text-sm text-muted">Verifying your email…</p>}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="text-sm text-text">Your email is verified.</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="h-10 w-10 text-danger" />
            <p className="text-sm text-text">
              This verification link is invalid or has expired.
            </p>
          </>
        )}
        <Link to="/app/today">
          <Button>Go to app</Button>
        </Link>
      </div>
    </AuthLayout>
  );
}
