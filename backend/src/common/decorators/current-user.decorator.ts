import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export type AuthUser = { id: string; email: string; name: string };

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);
