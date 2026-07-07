import { createToken } from '@/core/di';
import type { ListRepository, TagRepository, TaskRepository } from './types';

/** DI tokens for the repository ports. Features resolve these, not classes. */
export const TASK_REPO = createToken<TaskRepository>('TaskRepository');
export const LIST_REPO = createToken<ListRepository>('ListRepository');
export const TAG_REPO = createToken<TagRepository>('TagRepository');
