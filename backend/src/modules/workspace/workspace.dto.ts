import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  IsTimeZone,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const defined = (_: object, v: unknown) => v !== undefined;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class WorkspaceDto {
  name: string;
  logoUrl: string | null;
  timezone: string;
  weekStartsOn: number;
}

export class UpdateWorkspaceDto {
  @ValidateIf(defined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ValidateIf(defined)
  @IsTimeZone()
  timezone?: string;

  @ValidateIf(defined)
  @IsIn([0, 1])
  weekStartsOn?: number;
}
