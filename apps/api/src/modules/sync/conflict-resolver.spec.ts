import { resolveConflict } from './conflict-resolver';

describe('resolveConflict', () => {
  const base = {
    baseVersion: 0,
    currentVersion: 0,
    currentUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
    clientTs: new Date('2026-01-01T00:00:00.000Z'),
    incomingOp: 'upsert' as const,
    currentDeletedAt: null,
  };

  it('applies cleanly when baseVersion matches currentVersion', () => {
    const result = resolveConflict(base);
    expect(result).toEqual({ status: 'applied', shouldApply: true });
  });

  it('a delete always wins over a prior edit regardless of version', () => {
    const result = resolveConflict({
      ...base,
      baseVersion: 0,
      currentVersion: 5,
      incomingOp: 'delete',
    });
    expect(result).toEqual({ status: 'applied', shouldApply: true });
  });

  it('an edit against an already-deleted row loses unconditionally', () => {
    const result = resolveConflict({
      ...base,
      currentDeletedAt: new Date('2026-01-02T00:00:00.000Z'),
      incomingOp: 'upsert',
    });
    expect(result).toEqual({ status: 'conflict-lost', shouldApply: false });
  });

  it('a delete of an already-deleted row is not blocked by the tombstone check', () => {
    const result = resolveConflict({
      ...base,
      currentDeletedAt: new Date('2026-01-02T00:00:00.000Z'),
      incomingOp: 'delete',
    });
    expect(result).toEqual({ status: 'applied', shouldApply: true });
  });

  it('on version mismatch, a newer clientTs than the server row wins (conflict-merged)', () => {
    const result = resolveConflict({
      ...base,
      baseVersion: 0,
      currentVersion: 1,
      currentUpdatedAt: new Date('2026-01-01T00:00:00.000Z'),
      clientTs: new Date('2026-01-02T00:00:00.000Z'), // after server's last update
    });
    expect(result).toEqual({ status: 'conflict-merged', shouldApply: true });
  });

  it('on version mismatch, an older clientTs than the server row loses (conflict-lost)', () => {
    const result = resolveConflict({
      ...base,
      baseVersion: 0,
      currentVersion: 1,
      currentUpdatedAt: new Date('2026-01-02T00:00:00.000Z'),
      clientTs: new Date('2026-01-01T00:00:00.000Z'), // before server's last update
    });
    expect(result).toEqual({ status: 'conflict-lost', shouldApply: false });
  });

  it('treats an exact clientTs tie as the incoming change winning', () => {
    const tie = new Date('2026-01-01T12:00:00.000Z');
    const result = resolveConflict({
      ...base,
      baseVersion: 0,
      currentVersion: 1,
      currentUpdatedAt: tie,
      clientTs: tie,
    });
    expect(result).toEqual({ status: 'conflict-merged', shouldApply: true });
  });
});
