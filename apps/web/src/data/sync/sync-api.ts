import type { Change, PullResponse, PushResponse } from '@todomaster/shared';
import { apiClient } from '@/data/http/api-client';

/** Typed wrapper over /sync/push and /sync/pull — mirrors the shared protocol exactly. */
export const syncApi = {
  push: (changes: Change[]) => apiClient.post<PushResponse>('/sync/push', { changes }),

  pull: (since: string | null, limit = 500) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (since) params.set('since', since);
    return apiClient.get<PullResponse>(`/sync/pull?${params.toString()}`);
  },
};
