import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ItemKind, TaskStatus } from '../../../generated/prisma/enums';
import { PageQuery } from '../../tasks/dto/task.dto';
import { PersonDto } from '../../users/dto/person.dto';

export const singleLine = (s: string) => s.replace(/\p{Cc}/gu, '').trim();
const clean = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? singleLine(value) : value;
const defined = (_: object, v: unknown) => v !== undefined;

export class CreateItemDto {
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(255)
  name?: string;
}

export class UpdateItemDto {
  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @Transform(clean)
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @IsUUID()
  parentId?: string;
}

export const ITEM_FILTERS = ['all', 'files'] as const;

export class ChildrenQuery extends PageQuery {
  @ApiProperty({ enum: ITEM_FILTERS, required: false })
  @IsOptional()
  @IsIn(ITEM_FILTERS)
  type?: (typeof ITEM_FILTERS)[number];

  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(255)
  q?: string;
}

export class UploadQuery {
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class RawQuery {
  @IsString()
  exp: string;

  @IsString()
  sig: string;

  @IsOptional()
  @IsIn(['1'])
  dl?: string;
}

export class ItemDto {
  id: string;
  @ApiProperty({ enum: ItemKind, enumName: 'ItemKind' })
  kind: ItemKind;
  name: string;
  @ApiProperty({ type: PersonDto, nullable: true })
  creator: PersonDto | null;
  @ApiProperty({ type: Number, nullable: true })
  size: number | null;
  childCount: number;
  locked: boolean;
  @ApiProperty({ type: String, nullable: true })
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ItemsPageDto {
  items: ItemDto[];
  hasMore: boolean;
}

export class ItemProjectDto {
  id: string;
  key: string;
  name: string;
  color: string;
  archived: boolean;
}

export class RootDto extends ItemDto {
  @ApiProperty({ type: ItemProjectDto, nullable: true })
  project: ItemProjectDto | null;
}

export class ItemRefDto {
  id: string;
  name: string;
}

export class ItemTaskDto {
  id: string;
  key: string;
  title: string;
  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus' })
  status: TaskStatus;
}

export class ItemDetailDto extends RootDto {
  path: ItemRefDto[];
  readOnly: boolean;
  tasks: ItemTaskDto[];
  @ApiProperty({ type: String, nullable: true })
  mimeType: string | null;
}
