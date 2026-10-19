import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { TasksService } from '../tasks/tasks.service';
import { TrashEntryDto, TrashPageDto, TrashType } from './trash.dto';

const KEEP_DAYS = 30;

const inTrash = { deletedAt: { not: null } };

@Injectable()
export class TrashService {
  private readonly logger = new Logger(TrashService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsService,
    private readonly tasks: TasksService,
  ) {}

  async list(offset = 0, limit = 50): Promise<TrashPageDto> {
    const [projects, tasks, items] = await Promise.all([
      this.prisma.project.findMany({
        where: inTrash,
        select: { id: true, name: true, deletedAt: true },
      }),
      this.prisma.task.findMany({
        where: {
          ...inTrash,
          project: { deletedAt: null },
          OR: [{ parentId: null }, { parent: { deletedAt: null } }],
        },
        select: {
          id: true,
          number: true,
          title: true,
          deletedAt: true,
          project: { select: { key: true, name: true } },
        },
      }),
      this.items.trashed(),
    ]);
    const all: TrashEntryDto[] = [
      ...projects.map((p) => ({
        type: TrashType.project,
        id: p.id,
        name: p.name,
        kind: null,
        location: null,
        deletedAt: p.deletedAt!,
      })),
      ...tasks.map((t) => ({
        type: TrashType.task,
        id: t.id,
        name: `${t.project.key}-${t.number} ${t.title}`,
        kind: null,
        location: t.project.name,
        deletedAt: t.deletedAt!,
      })),
      ...items,
    ].sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime());
    return {
      items: all.slice(offset, offset + limit),
      hasMore: all.length > offset + limit,
    };
  }

  async restore(userId: string, type: TrashType, id: string): Promise<void> {
    if (type === TrashType.task) await this.tasks.restore(userId, id);
    else if (type === TrashType.item) await this.items.restore(id);
    else {
      const { count } = await this.prisma.project.updateMany({
        where: { id, ...inTrash },
        data: { deletedAt: null },
      });
      if (!count) throw notFound();
      await this.prisma.activity.create({
        data: {
          actorId: userId,
          projectId: id,
          action: 'project.restored',
          targetType: 'project',
          targetId: id,
        },
      });
    }
  }

  async purge(type: TrashType, id: string): Promise<void> {
    const where = { id, ...inTrash };
    const count =
      type === TrashType.item
        ? await this.items.purge(where)
        : type === TrashType.task
          ? (await this.prisma.task.deleteMany({ where })).count
          : await this.purgeProjects(where);
    if (!count) throw notFound();
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgeExpired(): Promise<void> {
    const where = {
      deletedAt: { lt: new Date(Date.now() - KEEP_DAYS * 86_400_000) },
    };
    const counts = {
      projects: await this.purgeProjects(where),
      tasks: (await this.prisma.task.deleteMany({ where })).count,
      items: await this.items.purge(where),
      milestones: (await this.prisma.milestone.deleteMany({ where })).count,
      comments: (await this.prisma.comment.deleteMany({ where })).count,
    };
    this.logger.log({ message: 'Trash purged', ...counts });
  }

  private async purgeProjects(where: {
    id?: string;
    deletedAt: object;
  }): Promise<number> {
    const rows = await this.prisma.project.findMany({
      where,
      select: { id: true },
    });
    const ids = rows.map((r) => r.id);
    if (!ids.length) return 0;
    await this.items.purge({ projectId: { in: ids } });
    await this.prisma.project.deleteMany({ where: { id: { in: ids } } });
    return ids.length;
  }
}

const notFound = () =>
  new NotFoundException({
    code: 'TRASH_NOT_FOUND',
    message: 'Not in Trash',
  });
