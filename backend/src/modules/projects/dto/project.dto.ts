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
import { ActivityDto, TaskRefDto } from '../../tasks/dto/task.dto';
import { PersonDto } from '../../users/dto/person.dto';

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

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class CreateProjectDto {
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @Matches(/^[A-Z]{2,5}$/)
  key: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string;

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

  @IsOptional()
  @IsUUID()
  ownerId?: string;

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
  members: PersonDto[];
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt: Date | null;
  pinned: boolean;
  taskCount: number;
  doneCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectStatsDto {
  taskCount: number;
  todoCount: number;
  inProgressCount: number;
  reviewCount: number;
  doneCount: number;
  overdueCount: number;
}

export class ProjectActivityDto extends ActivityDto {
  @ApiProperty({ type: TaskRefDto, nullable: true })
  task: TaskRefDto | null;
}

export class ProjectActivityPageDto {
  items: ProjectActivityDto[];
  hasMore: boolean;
}

export class FavoriteDto {
  id: string;
  key: string;
  name: string;
  color: string;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  archivedAt: Date | null;
}
