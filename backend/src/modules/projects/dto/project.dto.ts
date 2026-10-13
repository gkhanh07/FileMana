import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ProjectStatus } from '../../../generated/prisma/enums';
import { PersonDto } from '../../users/dto/person.dto';

// Names of the icon colors; the frontend maps each to a design token.
export const PROJECT_COLORS = [
  'blue',
  'teal',
  'green',
  'amber',
  'red',
  'pink',
  'violet',
  'slate',
] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// A calendar date (2026-10-15), never converted to UTC (CLAUDE.md, API Contract).
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateProjectDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  // Suggested by the client from the name; cannot change after creation.
  @Matches(/^[A-Z]{2,5}$/)
  key: string;

  // An empty string clears it.
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string;

  // Random when left out.
  @IsOptional()
  @IsIn(PROJECT_COLORS)
  color?: string;

  @ApiProperty({
    enum: ProjectStatus,
    enumName: 'ProjectStatus',
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  // Defaults to the creator.
  @IsOptional()
  @IsUUID()
  ownerId?: string;

  // null clears it.
  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @Matches(DATE)
  @IsISO8601({ strict: true })
  startDate?: string | null;

  @ApiProperty({ type: String, nullable: true, required: false })
  @IsOptional()
  @Matches(DATE)
  @IsISO8601({ strict: true })
  dueDate?: string | null;
}

export class UpdateProjectDto extends PartialType(
  OmitType(CreateProjectDto, ['key'] as const),
) {}

export class DeleteProjectDto {
  // FR-PRJ-11: the project's name, typed to confirm.
  @IsString()
  name: string;
}

export class AddMemberDto {
  @IsUUID()
  userId: string;
}

export class ReorderFavoritesDto {
  @IsArray()
  @ArrayMaxSize(5)
  @IsUUID('all', { each: true })
  projectIds: string[];
}

export class ProjectDto {
  id: string;
  key: string;
  name: string;
  @ApiProperty({ type: String, nullable: true })
  description: string | null;
  color: string;
  @ApiProperty({ enum: ProjectStatus, enumName: 'ProjectStatus' })
  status: ProjectStatus;
  @ApiProperty({ type: String, nullable: true })
  startDate: string | null;
  @ApiProperty({ type: String, nullable: true })
  dueDate: string | null;
  owner: PersonDto;
  // The owner first, then in the order they were added.
  members: PersonDto[];
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt: Date | null;
  // In the current user's Favorites.
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class FavoriteDto {
  id: string;
  key: string;
  name: string;
  color: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt: Date | null;
}
