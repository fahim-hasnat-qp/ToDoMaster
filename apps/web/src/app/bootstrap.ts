import { container } from '@/core/di';
import { logger } from '@/core/logger';
import { db } from '@/data/db/database';
import { LocalTaskRepository } from '@/data/repositories/local-task-repository';
import { LocalListRepository } from '@/data/repositories/local-list-repository';
import { LocalTagRepository } from '@/data/repositories/local-tag-repository';
import {
  LIST_REPO,
  TAG_REPO,
  TASK_REPO,
} from '@/data/repositories/tokens';

/**
 * Composition root. Wires concrete implementations to DI tokens. This is the ONE
 * place that knows about concrete classes; the rest of the app depends on tokens.
 * When the remote/sync layer lands, we register a composed repo here — no feature
 * code changes.
 */
export function registerServices(): void {
  container.register(TASK_REPO, () => new LocalTaskRepository(db));
  container.register(LIST_REPO, () => new LocalListRepository(db));
  container.register(TAG_REPO, () => new LocalTagRepository(db));
}

/** One-time startup: seed default lists, etc. Idempotent. */
export async function initializeApp(): Promise<void> {
  registerServices();
  try {
    await container.resolve(LIST_REPO).ensureDefaults();
  } catch (error) {
    logger.error('Failed to seed default lists', error);
  }
}
