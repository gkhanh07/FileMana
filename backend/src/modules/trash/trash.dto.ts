import { ApiProperty } from '@nestjs/swagger';
import { ItemKind } from '../../generated/prisma/enums';

export enum TrashType {
  task = 'task',
  project = 'project',
  item = 'item',
}

export class TrashEntryDto {
  @ApiProperty({ enum: TrashType, enumName: 'TrashType' })
  type: TrashType;
  id: string;
  name: string;
  @ApiProperty({ enum: ItemKind, enumName: 'ItemKind', nullable: true })
  kind: ItemKind | null;
  @ApiProperty({ type: String, nullable: true })
  location: string | null;
  deletedAt: Date;
}

export class TrashPageDto {
  items: TrashEntryDto[];
  hasMore: boolean;
}
