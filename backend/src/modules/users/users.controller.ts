import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
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
import {
  CreateMemberDto,
  MemberDto,
  ResetPasswordDto,
  UpdateMemberDto,
} from './dto/member.dto';
import { PersonDto } from './dto/person.dto';
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

  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserDto> {
    return this.users.updateMe(user.id, dto);
  }

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

  @Delete('sessions')
  @HttpCode(204)
  signOutOthers(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() sessionId: string,
  ): Promise<void> {
    return this.users.signOutOthers(user.id, sessionId);
  }
}

@Controller('avatars')
export class AvatarsController {
  constructor(private readonly users: UsersService) {}

  @Get(':file')
  get(@Param('file') file: string, @Res() res: Response): void {
    const path = this.users.avatarPath(file);
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.sendFile(path);
  }
}

@Controller('users')
export class PeopleController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(): Promise<PersonDto[]> {
    return this.users.people();
  }
}

@Controller('members')
export class MembersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(): Promise<MemberDto[]> {
    return this.users.members();
  }

  @Post()
  create(@Body() dto: CreateMemberDto): Promise<MemberDto> {
    return this.users.createMember(dto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) id: string,
    @Body() dto: UpdateMemberDto,
  ): Promise<MemberDto> {
    return this.users.updateMember(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) id: string,
  ): Promise<void> {
    return this.users.deleteMember(user.id, id);
  }

  @Post(':id/password')
  @HttpCode(204)
  resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 })) id: string,
    @Body() dto: ResetPasswordDto,
  ): Promise<void> {
    return this.users.resetPassword(user.id, id, dto.password);
  }
}
