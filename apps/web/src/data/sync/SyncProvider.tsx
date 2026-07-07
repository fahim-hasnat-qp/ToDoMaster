import { useEffect, useRef } from 'react';
import { db } from '@/data/db/database';
import { config } from '@/core/config';
import { logger } from '@/core/logger';
import { useAuthStore } from '@/features/auth/auth-store';
import { useTaskStore } from '@/features/tasks/task-store';
import { useListStore } from '@/features/lists/list-store';
import { useTagStore } from '@/features/tags/tag-store';
import { SyncEngine } from './sync-engine';

/**
 * Runs the sync engine on an interval while a session exists, plus immediately
 * on regaining network connectivity — offline periods just accumulate outbox
 * entries (already durable in IndexedDB) until one of these triggers fires.
 * Renders nothing; this is a side-effect-only component mounted once near the
 * app root, same pattern as ReminderSchedulerProvider.
 */
export function SyncProvider() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const engineRef = useRef<SyncEngine>();
  const runningRef = useRef(false);

  if (!engineRef.current) {
    engineRef.current = new SyncEngine(db);
  }

  useEffect(() => {
    if (!accessToken) return;

    const runCycle = async () => {
      if (runningRef.current) return; // don't overlap cycles
      runningRef.current = true;
      try {
        await engineRef.current?.runCycle();
        // Re-hydrate stores from Dexie so pulled/reconciled rows show up in the UI.
        await Promise.all([
          useTaskStore.getState().load(),
          useListStore.getState().load(),
          useTagStore.getState().load(),
        ]);
      } catch (error) {
        logger.error('Sync cycle failed', error);
      } finally {
        runningRef.current = false;
      }
    };

    void runCycle();
    const interval = setInterval(() => void runCycle(), config.syncIntervalMs);
    window.addEventListener('online', runCycle);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', runCycle);
    };
  }, [accessToken]);

  return null;
}
