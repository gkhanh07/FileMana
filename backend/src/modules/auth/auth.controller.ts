import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService, SESSION_COOKIE } from './auth.service';
import { LoginDto, UserDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // NFR-04: rate-limited per IP (see ThrottlerModule in AppModule); no account lockout.
  @Public()
  @UseGuards(ThrottlerGuard)
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserDto> {
    const { token, renewal, user } = await this.auth.login(
      dto.email,
      dto.password,
      dto.remember ?? false,
    );
    this.auth.setCookie(res, token, renewal);
    return user;
  }

  // Public so an already-expired session can still sign out (and get its cookie cleared).
  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookies = req.cookies as Record<string, string | undefined>;
    await this.auth.logout(cookies[SESSION_COOKIE]);
    this.auth.clearCookie(res);
  }
}
