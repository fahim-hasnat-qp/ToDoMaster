import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * Loose validation at the HTTP boundary (types + basic shape). The shared zod
 * schemas in packages/shared remain the single source of truth for the FULL
 * entity contract, re-validated on the client; duplicating every zod rule here
 * as class-validator decorators would just be two schemas drifting over time.
 */
export class CreateTaskDto {
  @IsString()
  title!: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsUUID()
  listId?: string | null;

  @IsOptional() @IsInt() @Min(0) @Max(3)
  priority?: number;

  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dueDate?: string | null;

  @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  dueTime?: string | null;

  @IsOptional() @IsBoolean()
  completed?: boolean;

  @IsOptional() @IsBoolean()
  archived?: boolean;

  @IsOptional() @IsObject()
  recurrence?: Record<string, unknown> | null;

  @IsOptional() @IsInt() @Min(0)
  recurrenceCount?: number;

  @IsOptional() @IsUUID()
  parentTaskId?: string | null;

  @IsOptional() @IsInt()
  order?: number;

  @IsOptional() @IsArray() @IsUUID('4', { each: true })
  tagIds?: string[];

  @IsOptional() @IsArray()
  checklist?: unknown[];

  @IsOptional() @IsArray()
  reminders?: unknown[];
}

export class UpdateTaskDto extends CreateTaskDto {
  @IsOptional() @IsDateString()
  completedAt?: string | null;
}

export class ListTasksQueryDto {
  @IsOptional() @IsIn(['true', 'false'])
  includeCompleted?: string;
}
