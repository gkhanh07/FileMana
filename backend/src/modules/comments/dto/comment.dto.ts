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

export class CreateCommentDto {
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  body: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  mentionIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID('all', { each: true })
  attachmentIds?: string[];
}

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
  @ApiProperty({ type: Date, nullable: true })
  editedAt: Date | null;
  createdAt: Date;
}

export class CommentsPageDto {
  items: CommentDto[];
  hasMore: boolean;
}
