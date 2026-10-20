import { Transform } from 'class-transformer';
import {
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { PROJECT_COLORS } from '../projects/dto/project.dto';

const defined = (_: object, v: unknown) => v !== undefined;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class LabelSummaryDto {
  id: string;
  name: string;
  color: string;
  taskCount: number;
}

export class CreateLabelDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name: string;

  @IsIn(PROJECT_COLORS)
  color: string;
}

export class UpdateLabelDto {
  @ValidateIf(defined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name?: string;

  @ValidateIf(defined)
  @IsIn(PROJECT_COLORS)
  color?: string;
}

export class MergeLabelDto {
  @IsUUID()
  targetId: string;
}
