import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
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
