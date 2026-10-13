import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Theme } from '../../generated/prisma/enums';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  theme: Theme;
};

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);
