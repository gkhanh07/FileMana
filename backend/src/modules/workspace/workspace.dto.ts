import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsTimeZone,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class WorkspaceDto {
  name: string;
  logoUrl: string | null;
  timezone: string;
  weekStartsOn: number;
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @IsOptional()
  @IsIn([0, 1])
  weekStartsOn?: number;
}
