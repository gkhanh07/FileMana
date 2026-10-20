import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { imagePath, saveImage } from '../../common/image';
import { PrismaService } from '../../prisma/prisma.service';
import { toAuthUser } from '../auth/auth.service';
import { UserDto } from '../auth/dto/login.dto';
import { Prisma } from '../../generated/prisma/client';
import { UserStatus } from '../../generated/prisma/enums';
import { CreateMemberDto, MemberDto, UpdateMemberDto } from './dto/member.dto';
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

const OPEN_TASKS = {
  status: { not: 'DONE' },
  deletedAt: null,
  project: { deletedAt: null },
} satisfies Prisma.TaskWhereInput;

const MEMBER_SELECT = {
  ...USER_SELECT,
  status: true,
  _count: { select: { assignedTasks: { where: OPEN_TASKS } } },
} as const;

const toMember = (u: {
  id: string;
  name: string;
  email: string;
  jobTitle: string | null;
  avatarFile: string | null;
  status: UserStatus;
  _count: { assignedTasks: number };
}): MemberDto => ({
  id: u.id,
  name: u.name,
  email: u.email,
  jobTitle: u.jobTitle,
  avatarUrl: u.avatarFile ? `/avatars/${u.avatarFile}` : null,
  status: u.status,
  openTaskCount: u._count.assignedTasks,
});

async function uniqueEmail<T>(query: Promise<T>): Promise<T> {
  try {
    return await query;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002'
    ) {
      throw new ConflictException({
        code: 'MEMBER_EMAIL_TAKEN',
        message: 'An account with this email already exists',
      });
    }
    throw e;
  }
}

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
      select: MEMBER_SELECT,
    });
    return users.map(toMember);
  }

  async createMember(dto: CreateMemberDto): Promise<MemberDto> {
    const user = await uniqueEmail(
      this.prisma.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          jobTitle: dto.jobTitle || null,
          passwordHash: await argon2.hash(dto.password),
        },
        select: MEMBER_SELECT,
      }),
    );
    return toMember(user);
  }

  async updateMember(id: string, dto: UpdateMemberDto): Promise<MemberDto> {
    await this.findMember(id);
    const user = await uniqueEmail(
      this.prisma.user.update({
        where: { id },
        data: {
          email: dto.email,
          name: dto.name,
          jobTitle:
            dto.jobTitle === undefined ? undefined : dto.jobTitle || null,
        },
        select: MEMBER_SELECT,
      }),
    );
    return toMember(user);
  }

  async deleteMember(actorId: string, id: string): Promise<void> {
    if (actorId === id) {
      throw new BadRequestException({
        code: 'CANNOT_DELETE_SELF',
        message: 'You cannot delete your own account',
      });
    }
    const { avatarFile } = await this.findMember(id);
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException({
          code: 'MEMBER_HAS_HISTORY',
          message: 'This member has projects, tasks, comments or activity',
        });
      }
      throw e;
    }
    if (avatarFile) await rm(join(this.avatarDir, avatarFile), { force: true });
  }

  async deactivateMember(
    actorId: string,
    id: string,
    assigneeId: string | undefined,
  ): Promise<void> {
    if (actorId === id) {
      throw new BadRequestException({
        code: 'CANNOT_DEACTIVATE_SELF',
        message: 'You cannot deactivate your own account',
      });
    }
    const member = await this.findMember(id);
    await this.prisma.$transaction(async (tx) => {
      // Archived projects included on purpose (FR-SET-09 decision D1): no task may stay with a deactivated member.
      const tasks = await tx.task.findMany({
        where: { assigneeId: id, ...OPEN_TASKS },
        select: { id: true, projectId: true },
      });
      if (tasks.length) {
        if (!assigneeId || assigneeId === id) {
          throw new BadRequestException({
            code: 'ASSIGNEE_REQUIRED',
            message: 'Choose who takes over the open tasks',
          });
        }
        const assignee = await tx.user.findFirst({
          where: { id: assigneeId, status: { not: 'DEACTIVATED' } },
          select: { id: true, name: true },
        });
        if (!assignee) {
          throw new NotFoundException({
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          });
        }
        await tx.task.updateMany({
          where: { id: { in: tasks.map((t) => t.id) } },
          data: { assigneeId },
        });
        await tx.activity.createMany({
          data: tasks.map((t) => ({
            actorId,
            projectId: t.projectId,
            action: 'task.assignee',
            targetType: 'task',
            targetId: t.id,
            oldValue: { id, name: member.name },
            newValue: assignee,
          })),
        });
      }
      await tx.user.update({ where: { id }, data: { status: 'DEACTIVATED' } });
      await tx.session.deleteMany({ where: { userId: id } });
    });
  }

  async reactivateMember(id: string): Promise<void> {
    await this.findMember(id);
    await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }

  private async findMember(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { avatarFile: true, name: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Member not found',
      });
    }
    return user;
  }

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

  async setAvatar(userId: string, data: Buffer | undefined): Promise<UserDto> {
    const file = await saveImage(this.avatarDir, data);
    return this.replaceAvatar(userId, file);
  }

  removeAvatar(userId: string): Promise<UserDto> {
    return this.replaceAvatar(userId, null);
  }

  avatarPath(file: string): string {
    return imagePath(this.avatarDir, file);
  }

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
