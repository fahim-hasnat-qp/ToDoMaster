import { z } from 'zod';
import { syncMetaSchema, hexColorSchema } from './common.js';

export const listSchema = syncMetaSchema.extend({
  name: z.string().min(1).max(100),
  color: hexColorSchema,
  icon: z.string().max(40).default('list'),
  isDefault: z.boolean().default(false),
  order: z.number().default(0),
});
export type List = z.infer<typeof listSchema>;

export const createListSchema = listSchema
  .pick({ name: true, color: true, icon: true, order: true })
  .partial({ icon: true, order: true });
export type CreateListInput = z.infer<typeof createListSchema>;

export const updateListSchema = createListSchema.partial();
export type UpdateListInput = z.infer<typeof updateListSchema>;

/** The four seeded default lists. Colors chosen for the default palette. */
export const DEFAULT_LISTS: ReadonlyArray<
  Pick<List, 'name' | 'color' | 'icon' | 'order'>
> = [
  { name: 'Personal', color: '#6C8EF5', icon: 'user', order: 0 },
  { name: 'Work', color: '#F5A623', icon: 'briefcase', order: 1 },
  { name: 'Shopping', color: '#50C878', icon: 'shopping-cart', order: 2 },
  { name: 'Study', color: '#B06CF5', icon: 'book', order: 3 },
];
