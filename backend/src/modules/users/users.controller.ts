import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  CurrentSessionId,
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { UserDto } from '../auth/dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser): UserDto {
    return user;
  }

  // FR-SET-01 (name, job title), FR-SHELL-06 (theme).
  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserDto> {
    return this.users.updateMe(user.id, dto);
  }

  // Multipart field `file`; JPG, PNG or WebP up to 2 MB.
  @Put('avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: AVATAR_MAX_BYTES } }),
  )
  setAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<UserDto> {
    return this.users.setAvatar(user.id, file?.buffer);
  }

  @Delete('avatar')
  removeAvatar(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.users.removeAvatar(user.id);
  }

  // Rate-limited like sign-in, so the current password can't be guessed here instead.
  @Post('password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(204)
  changePassword(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() sessionId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    return this.users.changePassword(
      user.id,
      sessionId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  // FR-SET-02: "sign out of all devices", except this one.
  @Delete('sessions')
  @HttpCode(204)
  signOutOthers(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() sessionId: string,
  ): Promise<void> {
    return this.users.signOutOthers(user.id, sessionId);
  }
}

// Any signed-in user may see any avatar (no roles).
@Controller('avatars')
export class AvatarsController {
  constructor(private readonly users: UsersService) {}

  @Get(':file')
  get(@Param('file') file: string, @Res() res: Response): void {
    const path = this.users.avatarPath(file);
    // The web app is another origin in development; helmet's default would block the <img>.
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.sendFile(path);
  }
}
