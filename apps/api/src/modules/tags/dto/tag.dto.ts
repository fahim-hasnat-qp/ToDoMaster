import { IsOptional, IsString, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString()
  name!: string;

  @Matches(/^#([0-9a-fA-F]{6})$/)
  color!: string;
}

export class UpdateTagDto {
  @IsOptional() @IsString()
  name?: string;

  @IsOptional() @Matches(/^#([0-9a-fA-F]{6})$/)
  color?: string;
}
