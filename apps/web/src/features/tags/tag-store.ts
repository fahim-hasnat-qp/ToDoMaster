import { create } from 'zustand';
import {
  type CreateTagInput,
  type Tag,
  type UpdateTagInput,
} from '@todomaster/shared';
import { container } from '@/core/di';
import { logger } from '@/core/logger';
import { TAG_REPO } from '@/data/repositories/tokens';

interface TagState {
  tags: Tag[];
  loading: boolean;
  load: () => Promise<void>;
  create: (input: CreateTagInput) => Promise<Tag>;
  update: (id: string, patch: UpdateTagInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const repo = () => container.resolve(TAG_REPO);

function upsertLocal(tags: Tag[], tag: Tag): Tag[] {
  const idx = tags.findIndex((t) => t.id === tag.id);
  if (idx === -1) return [...tags, tag];
  const next = tags.slice();
  next[idx] = tag;
  return next;
}

export const useTagStore = create<TagState>((set, get) => ({
  tags: [],
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const tags = await repo().getAll();
      set({ tags, loading: false });
    } catch (error) {
      logger.error('Failed to load tags', error);
      set({ loading: false });
    }
  },

  create: async (input) => {
    const tag = await repo().create(input);
    set({ tags: upsertLocal(get().tags, tag) });
    return tag;
  },

  update: async (id, patch) => {
    const tag = await repo().update(id, patch);
    set({ tags: upsertLocal(get().tags, tag) });
  },

  remove: async (id) => {
    await repo().softDelete(id);
    set({ tags: get().tags.filter((t) => t.id !== id) });
  },
}));
