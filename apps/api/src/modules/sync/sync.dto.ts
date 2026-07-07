import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChangeDto {
  @IsUUID()
  opId!: string;

  @IsIn(['task', 'list', 'tag'])
  entity!: 'task' | 'list' | 'tag';

  @IsUUID()
  entityId!: string;

  @IsIn(['upsert', 'delete'])
  op!: 'upsert' | 'delete';

  @IsOptional() @IsObject()
  payload?: Record<string, unknown>;

  @IsInt() @Min(0)
  baseVersion!: number;

  @IsDateString()
  clientTs!: string;
}

export class PushRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeDto)
  changes!: ChangeDto[];
}

export class PullQueryDto {
  @IsOptional() @IsDateString()
  since?: string;

  @IsOptional() @IsInt() @Min(1) @Max(1000)
  limit?: number;
}
