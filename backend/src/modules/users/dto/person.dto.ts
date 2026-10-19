import { ApiProperty } from '@nestjs/swagger';

export class PersonDto {
  id: string;
  name: string;
  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
}

export const PERSON_SELECT = {
  select: { id: true, name: true, avatarFile: true },
} as const;

export const toPerson = (u: {
  id: string;
  name: string;
  avatarFile: string | null;
}): PersonDto => ({
  id: u.id,
  name: u.name,
  avatarUrl: u.avatarFile ? `/avatars/${u.avatarFile}` : null,
});
