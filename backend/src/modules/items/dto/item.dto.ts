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

// Names are one line: control characters would break the list.
export const singleLine = (s: string) => s.replace(/\p{Cc}/gu, '').trim();
const clean = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? singleLine(value) : value;
const defined = (_: object, v: unknown) => v !== undefined;

// FR-FILE-07: a folder. Files arrive through the upload endpoints instead.
export class CreateItemDto {
  // Left out: the General folder.
  @IsOptional()
  @IsUUID()
  parentId?: string;

  // Required; checked by the service so an empty one says NAME_REQUIRED.
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(255)
  name?: string;
}

// Rename or move (FR-FILE-08), one at a time or together.
export class UpdateItemDto {
  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @Transform(clean)
  @IsString()
  @MaxLength(255)
  name?: string;

  // The folder to move it into.
  @ApiProperty({ required: false })
  @ValidateIf(defined)
  @IsUUID()
  parentId?: string;
}

export const ITEM_FILTERS = ['all', 'files'] as const;

// FR-FILE-04: a quick filter and a name search within one folder.
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

// Upload into this folder; left out: the General folder.
export class UploadQuery {
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

// NFR-05: the expiry and signature from an item's url.
export class RawQuery {
  @IsString()
  exp: string;

  @IsString()
  sig: string;

  // Download instead of showing it in the browser.
  @IsOptional()
  @IsIn(['1'])
  dl?: string;
}

export class ItemDto {
  id: string;
  @ApiProperty({ enum: ItemKind, enumName: 'ItemKind' })
  kind: ItemKind;
  name: string;
  // null on the General and project folders.
  @ApiProperty({ type: PersonDto, nullable: true })
  creator: PersonDto | null;
  // Files only, in bytes.
  @ApiProperty({ type: Number, nullable: true })
  size: number | null;
  // Folders: what is inside, so deleting a non-empty one asks first (FR-UI-07).
  childCount: number;
  // FR-FILE-07: the General and project folders can't be renamed, moved or deleted.
  locked: boolean;
  // Files: an API path that expires within two hours (NFR-05); add &dl=1 to download.
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

// FR-FILE-01: the General folder (no project), then one folder per project.
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

// One page per folder or file (FR-SHELL-07).
export class ItemDetailDto extends RootDto {
  // FR-FILE-02: the folders above it, General or the project folder first.
  path: ItemRefDto[];
  // Inside an archived project.
  readOnly: boolean;
  // FR-FILE-14: the tasks it is attached to.
  tasks: ItemTaskDto[];
  // Files: what the uploader's browser said it was.
  @ApiProperty({ type: String, nullable: true })
  mimeType: string | null;
}
