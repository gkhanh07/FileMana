import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { Prisma, type User } from '../../generated/prisma/client';

export const SESSION_COOKIE = 'sid';
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const TTL = { short: DAY, long: 30 * DAY };

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

type Renewal = { remember: boolean; expiresAt: Date };

@Injectable()
export class AuthService {
  private readonly dummyHash = argon2.hash('not-a-real-password');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string, remember: boolean) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    const hash = user?.status === 'ACTIVE' ? user.passwordHash : null;
    const ok = await argon2
      .verify(hash ?? (await this.dummyHash), password)
      .catch(() => false);
    if (!user || !hash || !ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    return this.startSession(user, remember);
  }

  async signUp(email: string, name: string, password: string) {
    try {
      const user = await this.prisma.user.create({
        data: { email, name, passwordHash: await argon2.hash(password) },
      });
      return await this.startSession(user, false);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'EMAIL_TAKEN',
          message: 'An account with this email already exists',
        });
      }
      throw e;
    }
  }

  private async startSession(user: User, remember: boolean) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + (remember ? TTL.long : TTL.short));
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      }),
      this.prisma.session.create({
        data: {
          tokenHash: sha256(token),
          userId: user.id,
          remember,
          expiresAt,
        },
      }),
    ]);
    return { token, renewal: { remember, expiresAt }, user: toAuthUser(user) };
  }

  async authenticate(
    token: string,
  ): Promise<{ user: AuthUser; sessionId: string; cookie?: Renewal } | null> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (
      !session ||
      session.expiresAt < new Date() ||
      session.user.status !== 'ACTIVE'
    ) {
      return null;
    }

    let cookie: Renewal | undefined;
    if (session.remember) {
      let expiresAt = session.expiresAt;
      if (Date.now() - session.lastUsedAt.getTime() > HOUR) {
        expiresAt = new Date(Date.now() + TTL.long);
        await this.prisma.session.update({
          where: { id: session.id },
          data: { expiresAt, lastUsedAt: new Date() },
        });
      }
      cookie = { remember: true, expiresAt };
    }
    return { user: toAuthUser(session.user), sessionId: session.id, cookie };
  }

  async logout(token: string | undefined) {
    if (!token) return;
    await this.prisma.session.deleteMany({
      where: { tokenHash: sha256(token) },
    });
  }

  setCookie(res: Response, token: string, { remember, expiresAt }: Renewal) {
    res.cookie(SESSION_COOKIE, token, {
      ...this.cookieBase(),
      ...(remember && { expires: expiresAt }),
    });
  }

  clearCookie(res: Response) {
    res.clearCookie(SESSION_COOKIE, this.cookieBase());
  }

  private cookieBase() {
    return {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.getOrThrow<boolean>('COOKIE_SECURE'),
      path: '/',
    };
  }
}

export type UserRow = Pick<
  User,
  'id' | 'email' | 'name' | 'theme' | 'jobTitle' | 'avatarFile'
>;

export const toAuthUser = (u: UserRow): AuthUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  theme: u.theme,
  jobTitle: u.jobTitle,
  avatarUrl: u.avatarFile ? `/avatars/${u.avatarFile}` : null,
});
