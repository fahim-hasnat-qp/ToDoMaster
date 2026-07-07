import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncEntity, taskSchema, type Task } from '@todomaster/shared';
import { TodoDatabase } from '@/data/db/database';
import { LocalTaskRepository } from '@/data/repositories/local-task-repository';
import { syncApi } from './sync-api';
import { SyncEngine } from './sync-engine';

vi.mock('./sync-api', () => ({
  syncApi: {
    push: vi.fn(),
    pull: vi.fn(),
  },
}));

function makeTask(overrides: Partial<Task> = {}): Task {
  return taskSchema.parse({
    id: crypto.randomUUID(),
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    version: 0,
    completedAt: null,
    title: 'Task',
    ...overrides,
  });
}

let db: TodoDatabase;
let repo: LocalTaskRepository;
let engine: SyncEngine;
let counter = 0;

beforeEach(async () => {
  vi.clearAllMocks();
  db = new TodoDatabase(`test-sync-${counter++}`);
  await db.open();
  repo = new LocalTaskRepository(db);
  engine = new SyncEngine(db);
});

describe('SyncEngine.push', () => {
  it('drains the outbox and clears entries whose push was applied', async () => {
    await repo.create({ title: 'Buy milk' });
    expect(await db.outbox.count()).toBe(1);

    vi.mocked(syncApi.push).mockResolvedValue({
      outcomes: [
        {
          opId: 'x',
          entityId: 'x',
          status: 'applied',
        },
      ],
      cursor: '2026-01-02T00:00:00.000Z',
    });
    vi.mocked(syncApi.pull).mockResolvedValue({ rows: [], cursor: '2026-01-02T00:00:00.000Z', hasMore: false });

    await engine.runCycle();

    expect(await db.outbox.count()).toBe(0);
    expect(syncApi.push).toHaveBeenCalledTimes(1);
  });

  it('applies the server row from a push outcome, overwriting local version/dirty', async () => {
    const created = await repo.create({ title: 'Old title' });

    vi.mocked(syncApi.push).mockResolvedValue({
      outcomes: [
        {
          opId: 'x',
          entityId: created.id,
          status: 'conflict-merged',
          serverRow: { ...created, title: 'Server-resolved title', version: 5 },
          newVersion: 5,
        },
      ],
      cursor: '2026-01-02T00:00:00.000Z',
    });
    vi.mocked(syncApi.pull).mockResolvedValue({ rows: [], cursor: '2026-01-02T00:00:00.000Z', hasMore: false });

    await engine.runCycle();

    const row = await db.tasks.get(created.id);
    expect(row?.title).toBe('Server-resolved title');
    expect(row?.version).toBe(5);
    expect(row?.dirty).toBe(false);
  });

  it('leaves the outbox intact when push fails, but still attempts pull', async () => {
    await repo.create({ title: 'Buy milk' });
    vi.mocked(syncApi.push).mockRejectedValue(new Error('network down'));
    vi.mocked(syncApi.pull).mockResolvedValue({ rows: [], cursor: '2026-01-01T00:00:00.000Z', hasMore: false });

    await engine.runCycle();

    // A failed push doesn't block pulling updates from other devices — only
    // OUR outgoing changes are retried next cycle; incoming ones aren't gated on it.
    expect(await db.outbox.count()).toBe(1);
    expect(syncApi.pull).toHaveBeenCalledTimes(1);
  });
});

describe('SyncEngine.pull', () => {
  it('upserts a pulled task row into Dexie', async () => {
    vi.mocked(syncApi.push).mockResolvedValue({ outcomes: [], cursor: '2026-01-01T00:00:00.000Z' });
    const remoteTask = makeTask({ title: 'From another device' });
    vi.mocked(syncApi.pull).mockResolvedValue({
      rows: [{ entity: SyncEntity.TASK, row: remoteTask }],
      cursor: '2026-01-02T00:00:00.000Z',
      hasMore: false,
    });

    await engine.runCycle();

    const row = await db.tasks.get(remoteTask.id);
    expect(row?.title).toBe('From another device');
    expect(row?.dirty).toBe(false);
  });

  it('persists the cursor and passes it as `since` on the next pull', async () => {
    vi.mocked(syncApi.push).mockResolvedValue({ outcomes: [], cursor: '2026-01-01T00:00:00.000Z' });
    vi.mocked(syncApi.pull).mockResolvedValue({
      rows: [],
      cursor: '2026-03-15T00:00:00.000Z',
      hasMore: false,
    });

    await engine.runCycle();
    await engine.runCycle();

    expect(syncApi.pull).toHaveBeenNthCalledWith(1, null);
    expect(syncApi.pull).toHaveBeenNthCalledWith(2, '2026-03-15T00:00:00.000Z');
  });

  it('follows hasMore to drain multi-page pulls before stopping', async () => {
    vi.mocked(syncApi.push).mockResolvedValue({ outcomes: [], cursor: '2026-01-01T00:00:00.000Z' });
    vi.mocked(syncApi.pull)
      .mockResolvedValueOnce({
        rows: [{ entity: SyncEntity.TASK, row: makeTask({ title: 'Page 1' }) }],
        cursor: '2026-01-02T00:00:00.000Z',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        rows: [{ entity: SyncEntity.TASK, row: makeTask({ title: 'Page 2' }) }],
        cursor: '2026-01-03T00:00:00.000Z',
        hasMore: false,
      });

    await engine.runCycle();

    expect(syncApi.pull).toHaveBeenCalledTimes(2);
    const all = await db.tasks.toArray();
    expect(all.map((t) => t.title).sort()).toEqual(['Page 1', 'Page 2']);
  });

  it('drops a pulled row that fails schema validation instead of throwing', async () => {
    vi.mocked(syncApi.push).mockResolvedValue({ outcomes: [], cursor: '2026-01-01T00:00:00.000Z' });
    vi.mocked(syncApi.pull).mockResolvedValue({
      rows: [{ entity: SyncEntity.TASK, row: { id: 'not-a-uuid', title: '' } }],
      cursor: '2026-01-02T00:00:00.000Z',
      hasMore: false,
    });

    await expect(engine.runCycle()).resolves.toBeUndefined();
    expect(await db.tasks.count()).toBe(0);
  });

  it('applies a tombstoned (deleted) pulled row without throwing', async () => {
    vi.mocked(syncApi.push).mockResolvedValue({ outcomes: [], cursor: '2026-01-01T00:00:00.000Z' });
    const deleted = makeTask({ deletedAt: '2026-01-05T00:00:00.000Z' });
    vi.mocked(syncApi.pull).mockResolvedValue({
      rows: [{ entity: SyncEntity.TASK, row: deleted }],
      cursor: '2026-01-02T00:00:00.000Z',
      hasMore: false,
    });

    await engine.runCycle();

    const row = await db.tasks.get(deleted.id);
    expect(row?.deletedAt).toBe('2026-01-05T00:00:00.000Z');
  });
});
