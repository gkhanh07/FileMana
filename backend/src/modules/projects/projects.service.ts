import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PERSON_SELECT, toPerson } from '../users/dto/person.dto';
import {
  CreateProjectDto,
  FavoriteDto,
  PROJECT_COLORS,
  ProjectDto,
  UpdateProjectDto,
} from './dto/project.dto';

const MAX_FAVORITES = 5;

const include = (userId: string) =>
  ({
    owner: PERSON_SELECT,
    members: { select: { user: PERSON_SELECT }, orderBy: { createdAt: 'asc' } },
    favorites: { where: { userId }, select: { userId: true } },
  }) satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{
  include: ReturnType<typeof include>;
}>;

const toDate = (d: string | null | undefined) =>
  d === undefined ? undefined : d === null ? null : new Date(`${d}T00:00:00Z`);
const fromDate = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

type Progress = { taskCount: number; doneCount: number };

function toDto(p: ProjectRow, progress: Progress): ProjectDto {
  const others = p.members.map((m) => m.user).filter((u) => u.id !== p.ownerId);
  return {
    id: p.id,
    key: p.key,
    name: p.name,
    description: p.description,
    color: p.color,
    status: p.status,
    startDate: fromDate(p.startDate),
    dueDate: fromDate(p.dueDate),
    owner: toPerson(p.owner),
    members: [p.owner, ...others].map(toPerson),
    archivedAt: p.archivedAt,
    pinned: p.favorites.length > 0,
    ...progress,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

type Log = {
  projectId: string;
  action: string;
  targetType: string;
  targetId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
};

// No roles (FR-ROLE-03): every signed-in user may do all of this to any project.
@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  // ponytail: the whole list in one request; ~10 people won't make enough projects to page.
  async list(userId: string): Promise<ProjectDto[]> {
    const rows = await this.prisma.project.findMany({
      where: { deletedAt: null },
      include: include(userId),
      orderBy: { updatedAt: 'desc' },
    });
    return this.toDtos(rows);
  }

  async get(userId: string, id: string): Promise<ProjectDto> {
    return this.toDto(await this.find(userId, id));
  }

  async create(userId: string, dto: CreateProjectDto): Promise<ProjectDto> {
    const ownerId = dto.ownerId ?? userId;
    await this.assertUser(ownerId);
    const color =
      dto.color ??
      PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)];
    try {
      const project = await this.prisma.$transaction(async (tx) => {
        const p = await tx.project.create({
          data: {
            name: dto.name,
            key: dto.key,
            description: dto.description || null,
            color,
            status: dto.status,
            startDate: toDate(dto.startDate),
            dueDate: toDate(dto.dueDate),
            ownerId,
            members: {
              create: [...new Set([ownerId, userId])].map((id) => ({
                userId: id,
              })),
            },
          },
          include: include(userId),
        });
        await this.log(tx, userId, {
          projectId: p.id,
          action: 'project.created',
          targetType: 'project',
          targetId: p.id,
          newValue: { name: p.name, key: p.key },
        });
        return p;
      });
      return toDto(project, { taskCount: 0, doneCount: 0 });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException({
          code: 'PROJECT_KEY_TAKEN',
          message: `Key ${dto.key} is already used`,
        });
      }
      throw e;
    }
  }

  // ponytail: field edits aren't in the activity log yet; FR-ACT-01 lists only project
  // created/archived and members added. Add a project.updated entry if someone asks.
  async update(
    userId: string,
    id: string,
    dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    const project = await this.findWritable(userId, id);
    if (dto.ownerId && dto.ownerId !== project.ownerId) {
      await this.assertUser(dto.ownerId);
    }
    const ownerId = dto.ownerId;
    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description:
          dto.description === undefined ? undefined : dto.description || null,
        color: dto.color,
        status: dto.status,
        startDate: toDate(dto.startDate),
        dueDate: toDate(dto.dueDate),
        ownerId,
        // The owner is always a member.
        members: ownerId
          ? {
              connectOrCreate: {
                where: { projectId_userId: { projectId: id, userId: ownerId } },
                create: { userId: ownerId },
              },
            }
          : undefined,
      },
      include: include(userId),
    });
    return this.toDto(updated);
  }

  // FR-PRJ-10: hidden from the default list and read-only until restored.
  async archive(userId: string, id: string): Promise<ProjectDto> {
    await this.findWritable(userId, id);
    return this.setArchived(userId, id, new Date(), 'project.archived');
  }

  async restore(userId: string, id: string): Promise<ProjectDto> {
    const project = await this.find(userId, id);
    if (!project.archivedAt) return this.toDto(project);
    return this.setArchived(userId, id, null, 'project.restored');
  }

  // FR-PRJ-11: soft delete; Trash (F19) restores or purges it after 30 days.
  async remove(userId: string, id: string, typedName: string): Promise<void> {
    const project = await this.find(userId, id);
    if (typedName.trim() !== project.name) {
      throw new BadRequestException({
        code: 'NAME_MISMATCH',
        message: 'Type the project name to confirm',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await this.log(tx, userId, {
        projectId: id,
        action: 'project.deleted',
        targetType: 'project',
        targetId: id,
      });
    });
  }

  // FR-PRJ-09
  async addMember(
    userId: string,
    id: string,
    memberId: string,
  ): Promise<ProjectDto> {
    await this.findWritable(userId, id);
    const user = await this.assertUser(memberId);
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.projectMember.createMany({
        data: { projectId: id, userId: memberId },
        skipDuplicates: true,
      });
      if (count) {
        await this.log(tx, userId, {
          projectId: id,
          action: 'member.added',
          targetType: 'user',
          targetId: memberId,
          newValue: { name: user.name },
        });
      }
    });
    return this.get(userId, id);
  }

  async removeMember(
    userId: string,
    id: string,
    memberId: string,
  ): Promise<ProjectDto> {
    const project = await this.findWritable(userId, id);
    if (memberId === project.ownerId) {
      throw new BadRequestException({
        code: 'CANNOT_REMOVE_OWNER',
        message: 'Change the owner before removing them',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.projectMember.deleteMany({
        where: { projectId: id, userId: memberId },
      });
      if (count) {
        await this.log(tx, userId, {
          projectId: id,
          action: 'member.removed',
          targetType: 'user',
          targetId: memberId,
        });
      }
    });
    return this.get(userId, id);
  }

  // FR-SHELL-03. Pinning is personal, so archived projects can be pinned too.
  async favorites(userId: string): Promise<FavoriteDto[]> {
    const rows = await this.prisma.favoriteProject.findMany({
      where: { userId, project: { deletedAt: null } },
      select: {
        project: {
          select: {
            id: true,
            key: true,
            name: true,
            color: true,
            archivedAt: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });
    return rows.map((r) => r.project);
  }

  async pin(userId: string, id: string): Promise<FavoriteDto[]> {
    await this.find(userId, id);
    const pinned = await this.favorites(userId);
    if (!pinned.some((p) => p.id === id)) {
      if (pinned.length >= MAX_FAVORITES) {
        throw new ConflictException({
          code: 'FAVORITES_FULL',
          message: `At most ${MAX_FAVORITES} favorites`,
        });
      }
      // ponytail: count-then-insert can race from two tabs at once; harmless at this size.
      const { _max } = await this.prisma.favoriteProject.aggregate({
        where: { userId },
        _max: { position: true },
      });
      await this.prisma.favoriteProject.upsert({
        where: { userId_projectId: { userId, projectId: id } },
        create: { userId, projectId: id, position: (_max.position ?? -1) + 1 },
        update: {},
      });
    }
    return this.favorites(userId);
  }

  async unpin(userId: string, id: string): Promise<FavoriteDto[]> {
    await this.prisma.favoriteProject.deleteMany({
      where: { userId, projectId: id },
    });
    return this.favorites(userId);
  }

  // Ids that aren't pinned are ignored.
  async reorder(userId: string, projectIds: string[]): Promise<FavoriteDto[]> {
    await this.prisma.$transaction(
      projectIds.map((projectId, position) =>
        this.prisma.favoriteProject.updateMany({
          where: { userId, projectId },
          data: { position },
        }),
      ),
    );
    return this.favorites(userId);
  }

  private async find(userId: string, id: string): Promise<ProjectRow> {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: include(userId),
    });
    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }
    return project;
  }

  // FR-ROLE-02: archived projects are read-only.
  private async findWritable(userId: string, id: string): Promise<ProjectRow> {
    const project = await this.find(userId, id);
    if (project.archivedAt) {
      throw new ForbiddenException({
        code: 'PROJECT_ARCHIVED',
        message: 'Archived projects are read-only',
      });
    }
    return project;
  }

  private async assertUser(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, status: { not: 'DEACTIVATED' } },
      select: { name: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
    return user;
  }

  private async setArchived(
    userId: string,
    id: string,
    archivedAt: Date | null,
    action: string,
  ): Promise<ProjectDto> {
    const project = await this.prisma.$transaction(async (tx) => {
      const p = await tx.project.update({
        where: { id },
        data: { archivedAt },
        include: include(userId),
      });
      await this.log(tx, userId, {
        projectId: id,
        action,
        targetType: 'project',
        targetId: id,
      });
      return p;
    });
    return this.toDto(project);
  }

  // FR-PRJ-04: progress is counted from the tasks, never stored.
  // ponytail: no subtasks yet; exclude them here once they exist (FR-PRJ-04).
  private async toDtos(rows: ProjectRow[]): Promise<ProjectDto[]> {
    const counts = await this.prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: { projectId: { in: rows.map((p) => p.id) }, deletedAt: null },
      _count: true,
    });
    return rows.map((p) => {
      const mine = counts.filter((c) => c.projectId === p.id);
      return toDto(p, {
        taskCount: mine.reduce((n, c) => n + c._count, 0),
        doneCount: mine.find((c) => c.status === 'DONE')?._count ?? 0,
      });
    });
  }

  private async toDto(row: ProjectRow): Promise<ProjectDto> {
    return (await this.toDtos([row]))[0];
  }

  // FR-ACT-01/02: written in the same transaction as the change.
  private log(tx: Prisma.TransactionClient, actorId: string, entry: Log) {
    return tx.activity.create({ data: { actorId, ...entry } });
  }
}
