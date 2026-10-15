import { ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/enums';
import { PersonDto } from '../../users/dto/person.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// A calendar date plus an optional time, read in the workspace timezone (CLAUDE.md, API Contract).
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// FR-TASK-21/22: only the title is required.
export class CreateTaskDto {
  @IsUUID()
  projectId: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus', required: false })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    enum: TaskPriority,
    enumName: 'TaskPriority',
    required: false,
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  // Left out: the creator. null: nobody.
  @ApiProperty({ type: String, nullable: true, required: false })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  assigneeId?: string | null;

  // null clears it, and its time with it.
  @ApiProperty({ type: String, nullable: true, required: false })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Matches(DATE)
  @IsISO8601({ strict: true })
  dueDate?: string | null;

  // HH:mm; needs a due date.
  @ApiProperty({ type: String, nullable: true, required: false })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Matches(TIME)
  dueTime?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  labelIds?: string[];

  // FR-PRJ-08: one of the project's milestones; null: none.
  @ApiProperty({ type: String, nullable: true, required: false })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  milestoneId?: string | null;

  // FR-TASK-17: makes it a subtask of this task (same project, one level deep).
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

const defined = (_: object, v: unknown) => v !== undefined;

// FR-TASK-04: inline edits send one field at a time. PartialType's IsOptional would let
// null through, so the fields that can't be empty say "only when sent" instead.
export class UpdateTaskDto extends PartialType(
  OmitType(CreateTaskDto, [
    'projectId',
    'parentId',
    'title',
    'status',
    'priority',
  ] as const),
) {
  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus', required: false })
  @ValidateIf(defined)
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiProperty({
    enum: TaskPriority,
    enumName: 'TaskPriority',
    required: false,
  })
  @ValidateIf(defined)
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  // FR-TASK-16: the editor's block list; null clears it. The body size limit (5 MB) caps it.
  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    nullable: true,
    required: false,
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsArray()
  description?: object[] | null;

  // FR-TASK-09: where it sits in its Kanban column (lower is higher up).
  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  position?: number;
}

// Offset paging for the lists that aren't task lists.
export class PageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class LabelDto {
  id: string;
  name: string;
  // A name from the project color palette.
  color: string;
}

export class TaskDto {
  id: string;
  // The project key plus the number: WEB-124.
  key: string;
  number: number;
  projectId: string;
  title: string;
  @ApiProperty({ type: String, nullable: true })
  parentId: string | null;
  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus' })
  status: TaskStatus;
  @ApiProperty({ enum: TaskPriority, enumName: 'TaskPriority' })
  priority: TaskPriority;
  @ApiProperty({ type: PersonDto, nullable: true })
  assignee: PersonDto | null;
  @ApiProperty({ type: String, nullable: true })
  dueDate: string | null;
  @ApiProperty({ type: String, nullable: true })
  dueTime: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt: Date | null;
  position: number;
  labels: LabelDto[];
  // FR-PRJ-08. A milestone in Trash keeps the link, so match it against the project's milestone list.
  @ApiProperty({ type: String, nullable: true })
  milestoneId: string | null;
  // FR-TASK-08
  attachmentCount: number;
  // FR-TASK-01/08
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class MyTaskProjectDto {
  id: string;
  key: string;
  name: string;
  color: string;
}

// FR-HOME-02, FR-MY-01: a task in a list that spans projects carries its project.
export class MyTaskDto extends TaskDto {
  project: MyTaskProjectDto;
}

export class DoneTasksDto {
  items: TaskDto[];
  hasMore: boolean;
}

export class TaskRefDto {
  id: string;
  key: string;
  title: string;
}

export class TaskProjectDto {
  id: string;
  key: string;
  name: string;
  archived: boolean;
  // FR-CMT-02: suggested first in the @ list.
  memberIds: string[];
}

// FR-TASK-13..17: everything the panel and the full page show.
export class TaskDetailDto extends TaskDto {
  @ApiProperty({ type: 'array', items: { type: 'object' }, nullable: true })
  description: object[] | null;
  project: TaskProjectDto;
  creator: PersonDto;
  @ApiProperty({ type: TaskRefDto, nullable: true })
  parent: TaskRefDto | null;
  subtasks: TaskDto[];
}

// FR-ACT-02: who did what, old → new.
export class ActivityDto {
  id: string;
  actor: PersonDto;
  action: string;
  @ApiProperty({ nullable: true })
  oldValue: unknown;
  @ApiProperty({ nullable: true })
  newValue: unknown;
  createdAt: Date;
}

export class ActivityPageDto {
  items: ActivityDto[];
  hasMore: boolean;
}
