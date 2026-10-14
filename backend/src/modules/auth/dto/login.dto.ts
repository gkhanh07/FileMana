import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Theme } from '../../../generated/prisma/enums';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SignUpDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  // Same rule as changing a password (FR-SET-02).
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password: string;
}

export class UserDto {
  id: string;
  email: string;
  name: string;
  @ApiProperty({ enum: Theme, enumName: 'Theme' })
  theme: Theme;
  @ApiProperty({ type: String, nullable: true })
  jobTitle: string | null;
  // A path on this API (`/avatars/<file>`); it changes on every upload, so it can be cached.
  @ApiProperty({ type: String, nullable: true })
  avatarUrl: string | null;
}
