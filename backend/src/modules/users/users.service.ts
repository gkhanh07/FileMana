import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { toAuthUser } from '../auth/auth.service';
import { UserDto } from '../auth/dto/login.dto';
import { MemberDto } from './dto/member.dto';
import { PERSON_SELECT, PersonDto, toPerson } from './dto/person.dto';
import { UpdateMeDto } from './dto/update-me.dto';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  theme: true,
  jobTitle: true,
  avatarFile: true,
} as const;

const AVATAR_FILE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

// The file's first bytes decide its type; the client's Content-Type is not trusted.
function imageExtension(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'png';
  if (
    b.subarray(0, 4).toString() === 'RIFF' &&
    b.subarray(8, 12).toString() === 'WEBP'
  )
    return 'webp';
  return null;
}

// Methods act on your own account (the id comes from the session), except the member list and reset.
@Injectable()
export class UsersService {
  private readonly avatarDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.avatarDir = resolve(
      config.getOrThrow<string>('UPLOAD_DIR'),
      'avatars',
    );
  }

  async people(): Promise<PersonDto[]> {
    const users = await this.prisma.user.findMany({
      where: { status: { not: 'DEACTIVATED' } },
      orderBy: { name: 'asc' },
      ...PERSON_SELECT,
    });
    return users.map(toPerson);
  }

  async members(): Promise<MemberDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { name: 'asc' },
      select: {
        ...USER_SELECT,
        status: true,
        _count: {
          select: {
            assignedTasks: {
              where: {
                status: { not: 'DONE' },
                deletedAt: null,
                project: { deletedAt: null },
              },
            },
          },
        },
      },
    });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      jobTitle: u.jobTitle,
      avatarUrl: u.avatarFile ? `/avatars/${u.avatarFile}` : null,
      status: u.status,
      openTaskCount: u._count.assignedTasks,
    }));
  }

  // FR-AUTH-02: signs the member out everywhere. Your own password is changed with the current one.
  async resetPassword(
    actorId: string,
    userId: string,
    password: string,
  ): Promise<void> {
    if (actorId === userId) {
      throw new BadRequestException({
        code: 'CANNOT_RESET_SELF',
        message: 'Change your own password in personal settings',
      });
    }
    const passwordHash = await argon2.hash(password);
    const [{ count }] = await this.prisma.$transaction([
      this.prisma.user.updateMany({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.session.deleteMany({ where: { userId } }),
    ]);
    if (!count) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member not found',
      });
    }
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserDto> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        theme: dto.theme,
        name: dto.name,
        jobTitle: dto.jobTitle === undefined ? undefined : dto.jobTitle || null,
      },
      select: USER_SELECT,
    });
    return toAuthUser(user);
  }

  // FR-SET-01: a new file name each time, so the old URL can stay cached forever.
  async setAvatar(userId: string, data: Buffer | undefined): Promise<UserDto> {
    const ext = data && imageExtension(data);
    if (!data || !ext) {
      throw new BadRequestException({
        code: 'INVALID_IMAGE',
        message: 'Avatar must be a JPG, PNG or WebP image',
      });
    }
    const file = `${randomUUID()}.${ext}`;
    await mkdir(this.avatarDir, { recursive: true });
    await writeFile(join(this.avatarDir, file), data);
    return this.replaceAvatar(userId, file);
  }

  removeAvatar(userId: string): Promise<UserDto> {
    return this.replaceAvatar(userId, null);
  }

  avatarPath(file: string): string {
    const path = join(this.avatarDir, file);
    if (!AVATAR_FILE.test(file) || !existsSync(path)) {
      throw new NotFoundException();
    }
    return path;
  }

  // FR-SET-02: this device stays signed in, every other one is signed out.
  async changePassword(
    userId: string,
    sessionId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const { passwordHash } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { passwordHash: true },
    });
    const ok =
      passwordHash &&
      (await argon2.verify(passwordHash, currentPassword).catch(() => false));
    if (!ok) {
      throw new BadRequestException({
        code: 'WRONG_PASSWORD',
        message: 'Current password is incorrect',
      });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await argon2.hash(newPassword) },
      }),
      this.signOutOthersQuery(userId, sessionId),
    ]);
  }

  async signOutOthers(userId: string, sessionId: string): Promise<void> {
    await this.signOutOthersQuery(userId, sessionId);
  }

  private signOutOthersQuery(userId: string, sessionId: string) {
    return this.prisma.session.deleteMany({
      where: { userId, id: { not: sessionId } },
    });
  }

  private async replaceAvatar(
    userId: string,
    file: string | null,
  ): Promise<UserDto> {
    const { avatarFile: old } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { avatarFile: true },
    });
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarFile: file },
      select: USER_SELECT,
    });
    if (old) await rm(join(this.avatarDir, old), { force: true });
    return toAuthUser(user);
  }
}
