import { create } from 'zustand';
import {
  type CreateListInput,
  type List,
  type UpdateListInput,
} from '@todomaster/shared';
import { container } from '@/core/di';
import { logger } from '@/core/logger';
import { AppError } from '@/core/result';
import { LIST_REPO } from '@/data/repositories/tokens';

interface ListState {
  lists: List[];
  loading: boolean;
  load: () => Promise<void>;
  create: (input: CreateListInput) => Promise<List>;
  update: (id: string, patch: UpdateListInput) => Promise<void>;
  /** Throws if the list is a default list — callers should catch and surface it. */
  remove: (id: string) => Promise<void>;
}

const repo = () => container.resolve(LIST_REPO);

function upsertLocal(lists: List[], list: List): List[] {
  const idx = lists.findIndex((l) => l.id === list.id);
  if (idx === -1) return [...lists, list].sort((a, b) => a.order - b.order);
  const next = lists.slice();
  next[idx] = list;
  return next;
}

export const useListStore = create<ListState>((set, get) => ({
  lists: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const lists = await repo().getAll();
      set({ lists, loading: false });
    } catch (error) {
      logger.error('Failed to load lists', error);
      set({ loading: false });
    }
  },

  create: async (input) => {
    const order = get().lists.length;
    const list = await repo().create({ order, ...input });
    set({ lists: upsertLocal(get().lists, list) });
    return list;
  },

  update: async (id, patch) => {
    const list = await repo().update(id, patch);
    set({ lists: upsertLocal(get().lists, list) });
  },

  remove: async (id) => {
    const target = get().lists.find((l) => l.id === id);
    if (target?.isDefault) {
      throw new AppError('VALIDATION', 'Default lists cannot be deleted.');
    }
    await repo().softDelete(id);
    set({ lists: get().lists.filter((l) => l.id !== id) });
  },
}));
