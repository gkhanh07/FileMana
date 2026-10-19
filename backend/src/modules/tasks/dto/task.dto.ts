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

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

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

  @ApiProperty({ type: String, nullable: true, required: false })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  assigneeId?: string | null;

  @ApiProperty({ type: String, nullable: true, required: false })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Matches(DATE)
  @IsISO8601({ strict: true })
  dueDate?: string | null;

  @ApiProperty({ type: String, nullable: true, required: false })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Matches(TIME)
  dueTime?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  labelIds?: string[];

  @ApiProperty({ type: String, nullable: true, required: false })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsUUID()
  milestoneId?: string | null;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

const defined = (_: object, v: unknown) => v !== undefined;

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

  @ApiProperty({
    type: 'array',
    items: { type: 'object' },
    nullable: true,
    required: false,
  })
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsArray()
  description?: object[] | null;

  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  position?: number;
}

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
  color: string;
}

export class TaskDto {
  id: string;
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
  @ApiProperty({ type: String, nullable: true })
  milestoneId: string | null;
  attachmentCount: number;
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
  memberIds: string[];
}

export class TaskDetailDto extends TaskDto {
  @ApiProperty({ type: 'array', items: { type: 'object' }, nullable: true })
  description: object[] | null;
  project: TaskProjectDto;
  creator: PersonDto;
  @ApiProperty({ type: TaskRefDto, nullable: true })
  parent: TaskRefDto | null;
  subtasks: TaskDto[];
}

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
