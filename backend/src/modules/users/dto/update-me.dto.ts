import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Theme } from '../../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateMeDto {
  @ApiProperty({ enum: Theme, enumName: 'Theme', required: false })
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  // FR-SET-01: one name, shown everywhere (full name and display name were merged).
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  // An empty string clears it.
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  jobTitle?: string;
}
