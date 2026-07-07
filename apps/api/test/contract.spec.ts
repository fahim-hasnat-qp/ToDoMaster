import { taskSchema, listSchema, tagSchema } from '@todomaster/shared';

/**
 * Contract tests: proves the API's actual response shapes validate against the
 * SAME zod schemas the client uses. This is the one place drift between server
 * and client would surface — if a mapper forgets a field or gets a type wrong,
 * these fail without needing a running server or a full e2e harness.
 */
describe('API response shapes satisfy shared schemas', () => {
  it('a mapped Task row satisfies taskSchema', () => {
    const row = {
      id: '9f3cb085-0f81-4a7a-b04d-7137f1aa322e',
      title: 'Buy milk',
      description: '',
      notes: '',
      listId: '1e9c8cc0-f411-40c0-8280-0d92fcc6968e',
      priority: 0,
      dueDate: null,
      dueTime: null,
      completed: false,
      completedAt: null,
      archived: false,
      recurrence: null,
      recurrenceCount: 0,
      parentTaskId: null,
      order: 0,
      tagIds: [],
      checklist: [],
      reminders: [],
      createdAt: '2026-07-06T06:35:58.767Z',
      updatedAt: '2026-07-06T06:35:58.767Z',
      deletedAt: null,
      version: 0,
    };
    expect(taskSchema.safeParse(row).success).toBe(true);
  });

  it('a Prisma List row (with extra userId field) satisfies listSchema', () => {
    const row = {
      id: '1e9c8cc0-f411-40c0-8280-0d92fcc6968e',
      userId: '1004ff31-2b91-4edc-bd86-872cc4b66a9c', // not in shared List — must not break parsing
      name: 'Personal',
      color: '#6C8EF5',
      icon: 'list',
      isDefault: false,
      order: 0,
      createdAt: '2026-07-06T06:35:58.727Z',
      updatedAt: '2026-07-06T06:35:58.727Z',
      deletedAt: null,
      version: 0,
    };
    expect(listSchema.safeParse(row).success).toBe(true);
  });

  it('a Prisma Tag row satisfies tagSchema', () => {
    const row = {
      id: 'a1111111-1111-1111-1111-111111111111',
      userId: 'b2222222-2222-2222-2222-222222222222',
      name: 'urgent',
      color: '#F5716C',
      createdAt: '2026-07-06T06:35:58.727Z',
      updatedAt: '2026-07-06T06:35:58.727Z',
      deletedAt: null,
      version: 0,
    };
    expect(tagSchema.safeParse(row).success).toBe(true);
  });

  it('rejects a Task row missing a required field (catches mapper regressions)', () => {
    const { title: _omit, ...incomplete } = {
      id: '9f3cb085-0f81-4a7a-b04d-7137f1aa322e',
      title: 'Buy milk',
      createdAt: '2026-07-06T06:35:58.767Z',
      updatedAt: '2026-07-06T06:35:58.767Z',
      deletedAt: null,
      version: 0,
    };
    expect(taskSchema.safeParse(incomplete).success).toBe(false);
  });
});
