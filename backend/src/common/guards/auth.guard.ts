import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { IS_PUBLIC } from '../decorators/public.decorator';
import { AuthService, SESSION_COOKIE } from '../../modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    ) {
      return true;
    }
    const http = ctx.switchToHttp();
    const req = http.getRequest<
      Request & { user?: unknown; sessionId?: string }
    >();
    const token = (req.cookies as Record<string, string | undefined>)?.[
      SESSION_COOKIE
    ];
    const found = token ? await this.auth.authenticate(token) : null;
    if (!found)
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Not signed in',
      });
    req.user = found.user;
    req.sessionId = found.sessionId;
    if (found.cookie)
      this.auth.setCookie(http.getResponse<Response>(), token!, found.cookie);
    return true;
  }
}
