import { IsBoolean, IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class CreateListDto {
  @IsString()
  name!: string;

  @Matches(/^#([0-9a-fA-F]{6})$/)
  color!: string;

  @IsOptional() @IsString()
  icon?: string;

  @IsOptional() @IsInt()
  order?: number;
}

export class UpdateListDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @Matches(/^#([0-9a-fA-F]{6})$/)
  color?: string;

  @IsOptional() @IsString()
  icon?: string;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;

  @IsOptional() @IsInt()
  order?: number;
}
