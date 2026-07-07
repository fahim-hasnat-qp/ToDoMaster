import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { AccountBanner } from '@/features/auth/AccountBanner';

/** Persistent chrome around every /app route. */
export function AppShell() {
  return (
    <div className="flex h-full flex-col">
      <AccountBanner />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="relative flex-1 overflow-y-auto scrollbar-thin pb-16 sm:pb-0">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
