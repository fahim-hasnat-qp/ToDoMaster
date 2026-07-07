import { z } from 'zod';
import { syncMetaSchema, hexColorSchema } from './common.js';

export const tagSchema = syncMetaSchema.extend({
  name: z.string().min(1).max(50),
  color: hexColorSchema,
});
export type Tag = z.infer<typeof tagSchema>;

export const createTagSchema = tagSchema.pick({ name: true, color: true });
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTagSchema = createTagSchema.partial();
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
