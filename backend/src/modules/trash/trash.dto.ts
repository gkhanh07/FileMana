import { ApiProperty } from '@nestjs/swagger';
import { ItemKind } from '../../generated/prisma/enums';

export enum TrashType {
  task = 'task',
  project = 'project',
  item = 'item',
}

// FR-SET-13: one deleted thing; it is purged 30 days after `deletedAt`.
export class TrashEntryDto {
  @ApiProperty({ enum: TrashType, enumName: 'TrashType' })
  type: TrashType;
  id: string;
  name: string;
  // Items only.
  @ApiProperty({ enum: ItemKind, enumName: 'ItemKind', nullable: true })
  kind: ItemKind | null;
  // The project (or General) it would go back to; null for a project.
  @ApiProperty({ type: String, nullable: true })
  location: string | null;
  deletedAt: Date;
}

export class TrashPageDto {
  items: TrashEntryDto[];
  hasMore: boolean;
}
