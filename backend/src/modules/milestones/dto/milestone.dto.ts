import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateMilestoneDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @Matches(DATE)
  @IsISO8601({ strict: true })
  date: string;
}

const defined = (_: object, v: unknown) => v !== undefined;

export class UpdateMilestoneDto {
  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @Matches(DATE)
  @IsISO8601({ strict: true })
  date?: string;
}

export class MilestoneDto {
  id: string;
  projectId: string;
  name: string;
  date: string;
  taskCount: number;
  doneCount: number;
}
