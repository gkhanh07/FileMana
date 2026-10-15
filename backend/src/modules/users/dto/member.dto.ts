import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserStatus } from '../../../generated/prisma/enums';

// FR-SET-06: a row of the member table.
export class MemberDto {
  id: string;
  name: string;
  email: string;
  @ApiProperty({ type: String, nullable: true })
  jobTitle: string | null;
  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status: UserStatus;
  // Not Done, not in Trash.
  openTaskCount: number;
}

// FR-AUTH-02: the temporary password another member hands over.
export class ResetPasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;
}

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const email = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

// Members page: add, edit and delete accounts for other people (beyond FR-AUTH-03 self sign-up).
export class CreateMemberDto {
  @Transform(email)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;
}

export class UpdateMemberDto {
  @IsOptional()
  @Transform(email)
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  // An empty string clears it.
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  jobTitle?: string;
}
