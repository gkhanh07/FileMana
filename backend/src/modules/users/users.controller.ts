import { Controller, Get } from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { UserDto } from '../auth/dto/login.dto';

@Controller('me')
export class UsersController {
  @Get()
  me(@CurrentUser() user: AuthUser): UserDto {
    return user;
  }
}
