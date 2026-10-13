import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { UserDto } from '../auth/dto/login.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UsersService } from './users.service';

@Controller('me')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() user: AuthUser): UserDto {
    return user;
  }

  // FR-SHELL-06: theme is saved per user.
  @Patch()
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMeDto,
  ): Promise<UserDto> {
    return this.users.updateMe(user.id, dto);
  }
}
