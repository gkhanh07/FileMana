import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ItemDto } from '../../items/dto/item.dto';
import { PersonDto } from '../../users/dto/person.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// FR-CMT-01..03. The body may be empty when files come with it.
export class CreateCommentDto {
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  body: string;

  // FR-CMT-02: the people picked from the @ list.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  mentionIds?: string[];

  // FR-CMT-03: files already uploaded to the task (POST tasks/:id/attachments).
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  attachmentIds?: string[];
}

// FR-CMT-04
export class UpdateCommentDto {
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  mentionIds?: string[];
}

export class CommentDto {
  id: string;
  taskId: string;
  author: PersonDto;
  body: string;
  mentions: PersonDto[];
  attachments: ItemDto[];
  // FR-CMT-04: set on edit; the UI shows "đã sửa".
  @ApiProperty({ type: Date, nullable: true })
  editedAt: Date | null;
  createdAt: Date;
}

// Newest first.
export class CommentsPageDto {
  items: CommentDto[];
  hasMore: boolean;
}
