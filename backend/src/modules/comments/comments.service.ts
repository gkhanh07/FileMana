import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { PERSON_SELECT, toPerson } from '../users/dto/person.dto';
import {
  CommentDto,
  CommentsPageDto,
  CreateCommentDto,
  UpdateCommentDto,
} from './dto/comment.dto';

const aliveTask = {
  deletedAt: null,
  project: { deletedAt: null },
  OR: [{ parentId: null }, { parent: { deletedAt: null } }],
} satisfies Prisma.TaskWhereInput;

const include = { author: PERSON_SELECT } satisfies Prisma.CommentInclude;
type Row = Prisma.CommentGetPayload<{ include: typeof include }>;

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsService,
  ) {}

  async list(taskId: string, offset = 0, limit = 20): Promise<CommentsPageDto> {
    if (
      !(await this.prisma.task.count({ where: { id: taskId, ...aliveTask } }))
    )
      throw taskNotFound();
    const rows = await this.prisma.comment.findMany({
      where: { taskId, deletedAt: null },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit + 1,
    });
    const page = rows.slice(0, limit);
    return { items: await this.toDtos(page), hasMore: rows.length > limit };
  }

  async create(
    userId: string,
    taskId: string,
    dto: CreateCommentDto,
  ): Promise<CommentDto> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, ...aliveTask },
      select: { projectId: true, project: { select: { archivedAt: true } } },
    });
    if (!task) throw taskNotFound();
    if (task.project.archivedAt) throw projectArchived();
    const fileIds = dto.attachmentIds?.length
      ? (
          await this.prisma.item.findMany({
            where: {
              id: { in: dto.attachmentIds },
              taskId,
              creatorId: userId,
              commentId: null,
              deletedAt: null,
            },
            select: { id: true },
          })
        ).map((i) => i.id)
      : [];
    if (!dto.body && !fileIds.length) throw commentEmpty();
    const mentionIds = await this.mentionable(dto.mentionIds);
    const row = await this.prisma.$transaction(async (tx) => {
      const c = await tx.comment.create({
        data: { taskId, authorId: userId, body: dto.body, mentionIds },
        include,
      });
      if (fileIds.length)
        await tx.item.updateMany({
          where: { id: { in: fileIds } },
          data: { commentId: c.id },
        });
      await tx.activity.create({
        data: {
          actorId: userId,
          projectId: task.projectId,
          action: 'task.commented',
          targetType: 'task',
          targetId: taskId,
          newValue: { id: c.id },
        },
      });
      return c;
    });
    return (await this.toDtos([row]))[0];
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateCommentDto,
  ): Promise<CommentDto> {
    const c = await this.own(userId, id, false);
    if (!dto.body && !c._count.attachments) throw commentEmpty();
    const row = await this.prisma.comment.update({
      where: { id },
      data: {
        body: dto.body,
        mentionIds: await this.mentionable(dto.mentionIds),
        editedAt: new Date(),
      },
      include,
    });
    return (await this.toDtos([row]))[0];
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.own(userId, id, false);
    await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(userId: string, id: string): Promise<CommentDto> {
    await this.own(userId, id, true);
    const row = await this.prisma.comment.update({
      where: { id },
      data: { deletedAt: null },
      include,
    });
    return (await this.toDtos([row]))[0];
  }

  private async own(userId: string, id: string, deleted: boolean) {
    const c = await this.prisma.comment.findFirst({
      where: {
        id,
        deletedAt: deleted ? { not: null } : null,
        task: aliveTask,
      },
      select: {
        authorId: true,
        task: { select: { project: { select: { archivedAt: true } } } },
        _count: { select: { attachments: { where: { deletedAt: null } } } },
      },
    });
    if (!c) throw commentNotFound();
    if (c.authorId !== userId) throw notAuthor();
    if (c.task.project.archivedAt) throw projectArchived();
    return c;
  }

  private async mentionable(ids: string[] | undefined): Promise<string[]> {
    if (!ids?.length) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, status: { not: 'DEACTIVATED' } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private async toDtos(rows: Row[]): Promise<CommentDto[]> {
    const mentionIds = [...new Set(rows.flatMap((r) => r.mentionIds))];
    const [people, files] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: mentionIds } },
        ...PERSON_SELECT,
      }),
      this.items.forComments(rows.map((r) => r.id)),
    ]);
    const byId = new Map(people.map((p) => [p.id, toPerson(p)]));
    return rows.map((r) => ({
      id: r.id,
      taskId: r.taskId,
      author: toPerson(r.author),
      body: r.body,
      mentions: r.mentionIds.flatMap((id) => byId.get(id) ?? []),
      attachments: files.get(r.id) ?? [],
      editedAt: r.editedAt,
      createdAt: r.createdAt,
    }));
  }
}

const taskNotFound = () =>
  new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Task not found' });

const commentNotFound = () =>
  new NotFoundException({
    code: 'COMMENT_NOT_FOUND',
    message: 'Comment not found',
  });

const notAuthor = () =>
  new ForbiddenException({
    code: 'NOT_COMMENT_AUTHOR',
    message: 'Only the author can edit or delete a comment',
  });

const projectArchived = () =>
  new ForbiddenException({
    code: 'PROJECT_ARCHIVED',
    message: 'Archived projects are read-only',
  });

const commentEmpty = () =>
  new BadRequestException({
    code: 'COMMENT_EMPTY',
    message: 'Write something or attach a file',
  });
