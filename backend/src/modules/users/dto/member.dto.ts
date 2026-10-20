import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsUUID,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { UserStatus } from '../../../generated/prisma/enums';

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
  openTaskCount: number;
}

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

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(100)
  jobTitle?: string;
}

export class DeactivateMemberDto {
  /** Who takes over the member's open tasks. Required when they have any. */
  @ValidateIf((_: object, v: unknown) => v !== undefined)
  @IsUUID()
  assigneeId?: string;
}
