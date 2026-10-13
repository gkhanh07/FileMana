import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PERSON_SELECT, toPerson } from '../users/dto/person.dto';
import {
  CreateTaskDto,
  DoneTasksDto,
  LabelDto,
  TaskDto,
  UpdateTaskDto,
} from './dto/task.dto';

// The list shows Done tasks from the last 14 days; older ones come from "See all".
const RECENT_DONE_MS = 14 * 24 * 60 * 60 * 1000;
// FR-ACT-03
const MERGE_MS = 5 * 60 * 1000;

const include = {
  project: { select: { key: true } },
  assignee: PERSON_SELECT,
  labels: { select: { label: true }, orderBy: { label: { name: 'asc' } } },
} satisfies Prisma.TaskInclude;

type TaskRow = Prisma.TaskGetPayload<{ include: typeof include }>;

const toDate = (d: string | null | undefined) =>
  d === undefined ? undefined : d === null ? null : new Date(`${d}T00:00:00Z`);
const fromDate = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

function toDto(t: TaskRow): TaskDto {
  return {
    id: t.id,
    key: `${t.project.key}-${t.number}`,
    number: t.number,
    projectId: t.projectId,
    title: t.title,
    status: t.status,
    priority: t.priority,
    assignee: t.assignee ? toPerson(t.assignee) : null,
    dueDate: fromDate(t.dueDate),
    dueTime: t.dueTime,
    completedAt: t.completedAt,
    labels: t.labels.map((l) => l.label),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// What the activity log shows for each edited field (FR-ACT-02: old → new).
type Value = Prisma.JsonValue;
const due = (t: { dueDate: Date | null; dueTime: string | null }): Value =>
  t.dueDate ? [fromDate(t.dueDate), t.dueTime].filter(Boolean).join(' ') : null;
const person = (p: { id: string; name: string } | null): Value =>
  p ? { id: p.id, name: p.name } : null;
const same = (a: Value, b: Value) => JSON.stringify(a) === JSON.stringify(b);
const json = (v: Value) => (v === null ? Prisma.JsonNull : v);

// No roles (FR-ROLE-03): anyone can do this to any task of a project that isn't archived.
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  // FR-TASK-01..03: every task of the project in one response; the client groups,
  // filters and sorts. Done tasks only from the last 14 days.
  async list(projectId: string): Promise<TaskDto[]> {
    await this.findProject(projectId);
    const rows = await this.prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
        OR: [
          { status: { not: 'DONE' } },
          { completedAt: { gte: new Date(Date.now() - RECENT_DONE_MS) } },
        ],
      },
      include,
      orderBy: { number: 'asc' },
    });
    return rows.map(toDto);
  }

  // The Done group's "See all": the older Done tasks, newest first.
  async listOlderDone(
    projectId: string,
    offset = 0,
    limit = 50,
  ): Promise<DoneTasksDto> {
    await this.findProject(projectId);
    const rows = await this.prisma.task.findMany({
      where: {
        projectId,
        deletedAt: null,
        status: 'DONE',
        completedAt: { lt: new Date(Date.now() - RECENT_DONE_MS) },
      },
      include,
      orderBy: [{ completedAt: 'desc' }, { number: 'desc' }],
      skip: offset,
      take: limit + 1,
    });
    return {
      items: rows.slice(0, limit).map(toDto),
      hasMore: rows.length > limit,
    };
  }

  labels(): Promise<LabelDto[]> {
    return this.prisma.label.findMany({ orderBy: { name: 'asc' } });
  }

  // FR-TASK-05/21..23
  async create(userId: string, dto: CreateTaskDto): Promise<TaskDto> {
    await this.findProject(dto.projectId, true);
    const assigneeId = dto.assigneeId === undefined ? userId : dto.assigneeId;
    if (assigneeId) await this.assertUser(assigneeId);
    if (dto.dueTime && !dto.dueDate) throw dueTimeWithoutDate();
    if (dto.labelIds) await this.assertLabels(dto.labelIds);
    const status = dto.status ?? 'TODO';

    const task = await this.prisma.$transaction(async (tx) => {
      // Locks the project row, so two creates never get the same number.
      const { taskCounter } = await tx.project.update({
        where: { id: dto.projectId },
        data: { taskCounter: { increment: 1 } },
        select: { taskCounter: true },
      });
      const t = await tx.task.create({
        data: {
          projectId: dto.projectId,
          number: taskCounter,
          title: dto.title,
          status,
          priority: dto.priority,
          assigneeId,
          creatorId: userId,
          dueDate: toDate(dto.dueDate),
          dueTime: dto.dueDate ? dto.dueTime : null,
          completedAt: status === 'DONE' ? new Date() : null,
          labels: dto.labelIds && {
            create: [...new Set(dto.labelIds)].map((labelId) => ({ labelId })),
          },
        },
        include,
      });
      await tx.activity.create({
        data: {
          actorId: userId,
          projectId: t.projectId,
          action: 'task.created',
          targetType: 'task',
          targetId: t.id,
          newValue: { key: `${t.project.key}-${t.number}`, title: t.title },
        },
      });
      return t;
    });
    return toDto(task);
  }

  // FR-TASK-04. Each changed field gets its own activity entry, merged per FR-ACT-03.
  async update(
    userId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    const before = await this.findWritable(id);
    if (dto.assigneeId) await this.assertUser(dto.assigneeId);
    if (dto.labelIds) await this.assertLabels(dto.labelIds);
    const dueDate = toDate(dto.dueDate);
    const keepsDate =
      dueDate === undefined ? before.dueDate !== null : dueDate !== null;
    if (dto.dueTime && !keepsDate) throw dueTimeWithoutDate();
    const statusChanged =
      dto.status !== undefined && dto.status !== before.status;

    const after = await this.prisma.$transaction(async (tx) => {
      const t = await tx.task.update({
        where: { id },
        data: {
          title: dto.title,
          status: dto.status,
          priority: dto.priority,
          assigneeId: dto.assigneeId,
          dueDate,
          // Clearing the date clears its time.
          dueTime: dueDate === null ? null : dto.dueTime,
          completedAt: statusChanged
            ? dto.status === 'DONE'
              ? new Date()
              : null
            : undefined,
          labels: dto.labelIds && {
            deleteMany: {},
            create: [...new Set(dto.labelIds)].map((labelId) => ({ labelId })),
          },
        },
        include,
      });
      const changes: [string, Value, Value][] = [
        ['task.title', before.title, t.title],
        ['task.status', before.status, t.status],
        ['task.priority', before.priority, t.priority],
        ['task.assignee', person(before.assignee), person(t.assignee)],
        ['task.dueDate', due(before), due(t)],
        [
          'task.labels',
          before.labels.map((l) => l.label.name),
          t.labels.map((l) => l.label.name),
        ],
      ];
      for (const [action, oldValue, newValue] of changes) {
        if (!same(oldValue, newValue)) {
          await this.logChange(tx, userId, t, action, oldValue, newValue);
        }
      }
      return t;
    });
    return toDto(after);
  }

  // FR-ACT-03: if the task's latest entry is the same person changing the same field
  // within 5 minutes, update it instead of adding one; changed back means no entry at all.
  private async logChange(
    tx: Prisma.TransactionClient,
    actorId: string,
    task: TaskRow,
    action: string,
    oldValue: Value,
    newValue: Value,
  ) {
    const last = await tx.activity.findFirst({
      where: { targetType: 'task', targetId: task.id },
      orderBy: { createdAt: 'desc' },
    });
    if (
      last &&
      last.actorId === actorId &&
      last.action === action &&
      Date.now() - last.createdAt.getTime() < MERGE_MS
    ) {
      if (same(last.oldValue, newValue)) {
        await tx.activity.delete({ where: { id: last.id } });
      } else {
        await tx.activity.update({
          where: { id: last.id },
          data: { newValue: json(newValue) },
        });
      }
      return;
    }
    await tx.activity.create({
      data: {
        actorId,
        projectId: task.projectId,
        action,
        targetType: 'task',
        targetId: task.id,
        oldValue: json(oldValue),
        newValue: json(newValue),
      },
    });
  }

  private async findProject(id: string, writable = false) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: { archivedAt: true },
    });
    if (!project) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }
    if (writable && project.archivedAt) throw projectArchived();
  }

  // FR-ROLE-02: tasks of an archived project are read-only.
  private async findWritable(id: string): Promise<TaskRow> {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null, project: { deletedAt: null } },
      include: {
        ...include,
        project: { select: { key: true, archivedAt: true } },
      },
    });
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: 'Task not found',
      });
    }
    if (task.project.archivedAt) throw projectArchived();
    return task;
  }

  private async assertUser(id: string) {
    const count = await this.prisma.user.count({
      where: { id, status: { not: 'DEACTIVATED' } },
    });
    if (!count) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }
  }

  private async assertLabels(ids: string[]) {
    const unique = [...new Set(ids)];
    const count = await this.prisma.label.count({
      where: { id: { in: unique } },
    });
    if (count !== unique.length) {
      throw new NotFoundException({
        code: 'LABEL_NOT_FOUND',
        message: 'Label not found',
      });
    }
  }
}

const projectArchived = () =>
  new ForbiddenException({
    code: 'PROJECT_ARCHIVED',
    message: 'Archived projects are read-only',
  });

const dueTimeWithoutDate = () =>
  new BadRequestException({
    code: 'DUE_TIME_WITHOUT_DATE',
    message: 'A due time needs a due date',
  });
