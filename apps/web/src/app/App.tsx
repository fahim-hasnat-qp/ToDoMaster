import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from './ThemeProvider';
import { router } from './router';
import { initializeApp } from './bootstrap';
import { Toaster } from '@/components/Toaster';
import { useTaskStore } from '@/features/tasks/task-store';
import { useListStore } from '@/features/lists/list-store';
import { useTagStore } from '@/features/tags/tag-store';
import { useAuthStore } from '@/features/auth/auth-store';
import { ReminderSchedulerProvider } from '@/features/reminders/ReminderSchedulerProvider';
import { SyncProvider } from '@/data/sync/SyncProvider';

/**
 * App root: runs one-time initialization (DI wiring + seed), hydrates the stores
 * from the local DB, then renders the router. A tiny gate avoids a flash of empty
 * state before the local data loads (it's IndexedDB — near-instant).
 */
export function App() {
  const [ready, setReady] = useState(false);
  const loadTasks = useTaskStore((s) => s.load);
  const loadLists = useListStore((s) => s.load);
  const loadTags = useTagStore((s) => s.load);
  const ensureSession = useAuthStore((s) => s.ensureSession);

  useEffect(() => {
    let active = true;
    (async () => {
      await initializeApp();
      // Local data load gates readiness (offline-first golden rule); the auth
      // session bootstrap runs alongside it but never blocks the app becoming
      // usable — if it's offline or fails, sync just stays dormant.
      await Promise.all([loadLists(), loadTags(), loadTasks(), ensureSession()]);
      if (active) setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [loadLists, loadTags, loadTasks, ensureSession]);

  return (
    <ThemeProvider>
      {ready ? (
        <RouterProvider router={router} />
      ) : (
        <div className="grid h-full place-items-center text-muted">Loading…</div>
      )}
      <ReminderSchedulerProvider />
      <SyncProvider />
      <Toaster />
    </ThemeProvider>
  );
}
