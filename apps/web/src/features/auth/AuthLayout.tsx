import type { ReactNode } from 'react';
import { CheckSquare } from 'lucide-react';

export function AuthLayout({
  title,
  subtitle,
  children,
}: Readonly<{ title: string; subtitle?: string; children: ReactNode }>) {
  return (
    <div className="flex min-h-full items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-accent-fg">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}
