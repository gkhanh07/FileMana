import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import {
  ItemKind,
  ProjectStatus,
  TaskStatus,
} from '../../generated/prisma/enums';
import { PersonDto } from '../users/dto/person.dto';

export class SearchQuery {
  @IsString()
  @MaxLength(100)
  q: string;
}

export class SearchTaskDto {
  id: string;
  key: string;
  title: string;
  @ApiProperty({ enum: TaskStatus, enumName: 'TaskStatus' })
  status: TaskStatus;
  project: string; // its name: the row's location
  updatedAt: Date;
}

export class SearchProjectDto {
  id: string;
  name: string;
  color: string;
  @ApiProperty({ enum: ProjectStatus, enumName: 'ProjectStatus' })
  status: ProjectStatus;
  archived: boolean;
  updatedAt: Date;
}

export class SearchItemDto {
  id: string;
  @ApiProperty({ enum: ItemKind, enumName: 'ItemKind' })
  kind: ItemKind;
  name: string;
  @ApiProperty({ type: String, nullable: true })
  mimeType: string | null;
  location: string; // the project folder's name, or General's
  updatedAt: Date;
}

// FR-SEARCH-03: one list per group, most recently updated first.
export class SearchResultDto {
  tasks: SearchTaskDto[];
  projects: SearchProjectDto[];
  items: SearchItemDto[];
  members: PersonDto[];
}
