import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { Theme } from '../../../generated/prisma/enums';

export class UpdateMeDto {
  @ApiProperty({ enum: Theme, enumName: 'Theme', required: false })
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;
}
