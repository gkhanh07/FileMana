import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fold } from '../../common/fold';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { SearchItemDto } from '../search/search.dto';
import { TrashType, type TrashEntryDto } from '../trash/trash.dto';
import { PERSON_SELECT, toPerson } from '../users/dto/person.dto';
import {
  ChildrenQuery,
  CreateItemDto,
  ItemDetailDto,
  ItemDto,
  ItemsPageDto,
  RootDto,
  singleLine,
  UpdateItemDto,
} from './dto/item.dto';
import { filesDir, type StoredFile } from './upload';

const HOUR = 60 * 60 * 1000;

const PROJECT_SELECT = {
  select: {
    id: true,
    key: true,
    name: true,
    color: true,
    archivedAt: true,
    deletedAt: true,
  },
} as const;

const include = {
  creator: PERSON_SELECT,
  project: PROJECT_SELECT,
  _count: { select: { children: { where: { deletedAt: null } } } },
} satisfies Prisma.ItemInclude;

type ItemRow = Prisma.ItemGetPayload<{ include: typeof include }>;

const detailInclude = {
  ...include,
  task: {
    select: {
      id: true,
      number: true,
      title: true,
      status: true,
      deletedAt: true,
      project: { select: { key: true, deletedAt: true } },
      parent: { select: { deletedAt: true } },
    },
  },
} satisfies Prisma.ItemInclude;

const parentSelect = {
  id: true,
  kind: true,
  name: true,
  parentId: true,
  project: PROJECT_SELECT,
} satisfies Prisma.ItemSelect;

type Parent = Prisma.ItemGetPayload<{ select: typeof parentSelect }>;
type Project = NonNullable<Parent['project']>;
type Db = Prisma.TransactionClient;

const aliveTask = (id: string) =>
  ({
    id,
    deletedAt: null,
    project: { deletedAt: null },
    OR: [{ parentId: null }, { parent: { deletedAt: null } }],
  }) satisfies Prisma.TaskWhereInput;

function chain(parents: Map<string, Parent>, id: string): Parent[] | null {
  const path: Parent[] = [];
  for (let cur: string | null = id; cur;) {
    const p = parents.get(cur);
    if (!p || path.includes(p)) return null;
    path.unshift(p);
    cur = p.parentId;
  }
  return path[0]?.project?.deletedAt ? null : path;
}

const SIGNING_KEY = randomBytes(32);
const signature = (id: string, exp: number) =>
  createHmac('sha256', SIGNING_KEY).update(`${id}.${exp}`).digest('base64url');

function fileUrl(id: string) {
  const exp = ((Math.floor(Date.now() / HOUR) + 2) * HOUR) / 1000;
  return `/items/${id}/raw?exp=${exp}&sig=${signature(id, exp)}`;
}

function validSignature(id: string, exp: string, sig: string) {
  const n = Number(exp);
  if (!Number.isInteger(n) || n * 1000 < Date.now()) return false;
  const expected = Buffer.from(signature(id, n));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

const toProject = (p: Project | null) =>
  p && {
    id: p.id,
    key: p.key,
    name: p.name,
    color: p.color,
    archived: !!p.archivedAt,
  };

const displayName = (i: { name: string; project: Project | null }) =>
  i.project?.name ?? i.name;

function toDto(i: ItemRow): ItemDto {
  return {
    id: i.id,
    kind: i.kind,
    name: displayName(i),
    creator: i.creator && toPerson(i.creator),
    size: i.size,
    childCount: i._count.children,
    locked: !i.parentId,
    url: i.kind === 'FILE' ? fileUrl(i.id) : null,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

const fileData = (userId: string, parentId: string, file: StoredFile) => ({
  id: file.filename,
  kind: 'FILE' as const,
  name: singleLine(file.originalname).slice(0, 255) || file.filename,
  mimeType: file.mimetype.slice(0, 255),
  size: file.size,
  parentId,
  creatorId: userId,
});

@Injectable()
export class ItemsService {
  readonly filesDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.filesDir = filesDir(config);
  }

  async library(): Promise<ItemDetailDto> {
    const root = await this.prisma.item.findFirstOrThrow({
      where: { parentId: null, projectId: null },
      select: { id: true },
    });
    return this.detail(root.id);
  }

  async roots(): Promise<RootDto[]> {
    const rows = await this.prisma.item.findMany({
      where: {
        parentId: null,
        deletedAt: null,
        OR: [{ projectId: null }, { project: { deletedAt: null } }],
      },
      include,
    });
    return rows
      .map((r) => ({ ...toDto(r), project: toProject(r.project) }))
      .sort((a, b) =>
        !a.project ? -1 : !b.project ? 1 : a.name.localeCompare(b.name, 'vi'),
      );
  }

  async detail(id: string): Promise<ItemDetailDto> {
    const { item, path, project } = await this.find(id);
    const t = item.task;
    const attached =
      t && !t.deletedAt && !t.project.deletedAt && !t.parent?.deletedAt;
    return {
      ...toDto(item),
      project: toProject(project),
      path: path.map((p) => ({ id: p.id, name: displayName(p) })),
      readOnly: !!project?.archivedAt,
      tasks: attached
        ? [
            {
              id: t.id,
              key: `${t.project.key}-${t.number}`,
              title: t.title,
              status: t.status,
            },
          ]
        : [],
      mimeType: item.mimeType,
    };
  }

  async projectFolder(projectId: string): Promise<ItemDetailDto> {
    const root = await this.prisma.item.findFirst({
      where: { projectId, project: { deletedAt: null } },
      select: { id: true },
    });
    if (!root) {
      throw new NotFoundException({
        code: 'PROJECT_NOT_FOUND',
        message: 'Project not found',
      });
    }
    return this.detail(root.id);
  }

  async children(id: string, query: ChildrenQuery): Promise<ItemsPageDto> {
    const { item } = await this.find(id);
    if (item.kind !== 'FOLDER') throw itemNotFound();
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 50;
    const rows = await this.prisma.item.findMany({
      where: {
        parentId: id,
        deletedAt: null,
        kind: query.type === 'files' ? 'FILE' : undefined,
        name: query.q
          ? {
              contains: query.q.replace(/[\\%_]/g, '\\$&'),
              mode: 'insensitive',
            }
          : undefined,
      },
      include,
      orderBy: [{ kind: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: limit + 1,
    });
    return {
      items: rows.slice(0, limit).map(toDto),
      hasMore: rows.length > limit,
    };
  }

  async create(userId: string, dto: CreateItemDto): Promise<ItemDto> {
    if (!dto.name) throw nameRequired();
    const { folder } = await this.target(this.prisma, dto.parentId);
    const item = await this.prisma.item.create({
      data: {
        kind: 'FOLDER',
        name: dto.name,
        parentId: folder.id,
        creatorId: userId,
      },
      include,
    });
    return toDto(item);
  }

  async upload(
    userId: string,
    parentId: string | undefined,
    file: StoredFile | undefined,
  ): Promise<ItemDto> {
    if (!file) throw fileRequired();
    const { folder, project } = await this.target(this.prisma, parentId);
    const item = await this.prisma.$transaction(async (tx) => {
      const i = await tx.item.create({
        data: fileData(userId, folder.id, file),
        include,
      });
      await tx.activity.create({
        data: {
          actorId: userId,
          projectId: project?.id ?? null,
          action: 'file.uploaded',
          targetType: 'item',
          targetId: i.id,
          newValue: { name: i.name },
        },
      });
      return i;
    });
    return toDto(item);
  }

  async attach(
    userId: string,
    taskId: string,
    file: StoredFile | undefined,
  ): Promise<ItemDto> {
    if (!file) throw fileRequired();
    const task = await this.prisma.task.findFirst({
      where: aliveTask(taskId),
      select: {
        projectId: true,
        project: {
          select: { archivedAt: true, folder: { select: { id: true } } },
        },
      },
    });
    if (!task) throw taskNotFound();
    if (task.project.archivedAt) throw projectArchived();
    const folder = task.project.folder;
    if (!folder) throw itemNotFound();
    const item = await this.prisma.$transaction(async (tx) => {
      const i = await tx.item.create({
        data: { ...fileData(userId, folder.id, file), taskId },
        include,
      });
      await tx.activity.create({
        data: {
          actorId: userId,
          projectId: task.projectId,
          action: 'task.attachment',
          targetType: 'task',
          targetId: taskId,
          newValue: { id: i.id, name: i.name },
        },
      });
      return i;
    });
    return toDto(item);
  }

  async attachments(taskId: string): Promise<ItemDto[]> {
    if (!(await this.prisma.task.count({ where: aliveTask(taskId) }))) {
      throw taskNotFound();
    }
    const rows = await this.prisma.item.findMany({
      where: { taskId, deletedAt: null },
      include,
      orderBy: { createdAt: 'asc' },
    });
    if (!rows.length) return [];
    const parents = await this.parents(this.prisma);
    return rows
      .filter((r) => r.parentId && chain(parents, r.parentId))
      .map(toDto);
  }

  async forComments(commentIds: string[]): Promise<Map<string, ItemDto[]>> {
    const rows = await this.prisma.item.findMany({
      where: { commentId: { in: commentIds }, deletedAt: null },
      include,
      orderBy: { createdAt: 'asc' },
    });
    const files = new Map<string, ItemDto[]>();
    for (const r of rows) {
      const list = files.get(r.commentId!) ?? [];
      list.push(toDto(r));
      files.set(r.commentId!, list);
    }
    return files;
  }

  async update(id: string, dto: UpdateItemDto): Promise<ItemDetailDto> {
    const { item, project } = await this.find(id);
    if (project?.archivedAt) throw projectArchived();
    const renames = dto.name !== undefined && dto.name !== item.name;
    const moves = dto.parentId !== undefined && dto.parentId !== item.parentId;
    if ((renames || moves) && !item.parentId) throw itemLocked();
    if (dto.name === '') throw nameRequired();

    await this.prisma.$transaction(async (tx) => {
      if (moves) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('items.move'))`;
        const { path } = await this.target(tx, dto.parentId);
        if (path.some((p) => p.id === id)) {
          throw new BadRequestException({
            code: 'INVALID_MOVE',
            message: 'A folder cannot move into itself',
          });
        }
      }
      await tx.item.update({
        where: { id },
        data: { name: dto.name, parentId: moves ? dto.parentId : undefined },
      });
    });
    return this.detail(id);
  }

  async remove(id: string): Promise<void> {
    const { item, project } = await this.find(id);
    if (!item.parentId) throw itemLocked();
    if (project?.archivedAt) throw projectArchived();
    await this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<ItemDto> {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: { not: null } },
      select: { parentId: true },
    });
    const path =
      item?.parentId && chain(await this.parents(this.prisma), item.parentId);
    if (!path) throw itemNotFound();
    if (path[0].project?.archivedAt) throw projectArchived();
    return toDto(
      await this.prisma.item.update({
        where: { id },
        data: { deletedAt: null },
        include,
      }),
    );
  }

  async search(q: string, take: number): Promise<SearchItemDto[]> {
    const [rows, parents] = await Promise.all([
      this.prisma.item.findMany({
        where: { deletedAt: null, parentId: { not: null } },
        select: {
          id: true,
          kind: true,
          name: true,
          mimeType: true,
          parentId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.parents(this.prisma),
    ]);
    const hits: SearchItemDto[] = [];
    for (const { parentId, ...r } of rows) {
      if (hits.length === take) break;
      const path = fold(r.name).includes(q) && chain(parents, parentId!);
      if (path) hits.push({ ...r, location: displayName(path[0]) });
    }
    return hits;
  }

  async trashed(): Promise<TrashEntryDto[]> {
    const [rows, parents] = await Promise.all([
      this.prisma.item.findMany({
        where: { deletedAt: { not: null } },
        select: {
          id: true,
          kind: true,
          name: true,
          parentId: true,
          deletedAt: true,
        },
      }),
      this.parents(this.prisma),
    ]);
    return rows.flatMap((r) => {
      const path = r.parentId && chain(parents, r.parentId);
      return path
        ? [
            {
              type: TrashType.item,
              id: r.id,
              name: r.name,
              kind: r.kind,
              location: displayName(path[0]),
              deletedAt: r.deletedAt!,
            },
          ]
        : [];
    });
  }

  async purge(where: Prisma.ItemWhereInput): Promise<number> {
    const [roots, all] = await Promise.all([
      this.prisma.item.findMany({ where, select: { id: true } }),
      this.prisma.item.findMany({
        select: { id: true, parentId: true, kind: true },
      }),
    ]);
    if (!roots.length) return 0;
    const children = new Map<string | null, typeof all>();
    for (const i of all) {
      const list = children.get(i.parentId);
      if (list) list.push(i);
      else children.set(i.parentId, [i]);
    }
    const files: string[] = [];
    const walk = (i: { id: string; kind: string }) => {
      if (i.kind === 'FILE') files.push(i.id);
      children.get(i.id)?.forEach(walk);
    };
    const ids = new Set(roots.map((r) => r.id));
    all.filter((i) => ids.has(i.id)).forEach(walk);
    await this.prisma.item.deleteMany({
      where: { id: { in: [...ids] } },
    });
    await Promise.all(
      files.map((id) => unlink(join(this.filesDir, id)).catch(() => undefined)),
    );
    return roots.length;
  }

  async rawFile(id: string, exp: string, sig: string) {
    if (!validSignature(id, exp, sig)) {
      throw new ForbiddenException({
        code: 'LINK_EXPIRED',
        message: 'This link has expired',
      });
    }
    const { item } = await this.find(id);
    if (item.kind !== 'FILE') throw itemNotFound();
    await stat(join(this.filesDir, id)).catch(() => {
      throw itemNotFound();
    });
    return { name: item.name, dir: this.filesDir };
  }

  private async find(id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: detailInclude,
    });
    const path = !item
      ? null
      : item.parentId
        ? chain(await this.parents(this.prisma), item.parentId)
        : item.project?.deletedAt
          ? null
          : [];
    if (!item || !path) throw itemNotFound();
    return { item, path, project: path[0] ? path[0].project : item.project };
  }

  private async target(db: Db, parentId?: string) {
    const parents = await this.parents(db);
    const id =
      parentId ??
      [...parents.values()].find((p) => !p.parentId && !p.project)?.id;
    const path = id ? chain(parents, id) : null;
    const folder = path?.at(-1);
    if (!path || !folder) {
      throw itemNotFound();
    }
    const project = path[0].project;
    if (project?.archivedAt) throw projectArchived();
    return { folder, path, project };
  }

  private async parents(db: Db) {
    const rows = await db.item.findMany({
      where: { kind: 'FOLDER', deletedAt: null },
      select: parentSelect,
    });
    return new Map(rows.map((r) => [r.id, r]));
  }
}

const itemNotFound = () =>
  new NotFoundException({ code: 'ITEM_NOT_FOUND', message: 'Item not found' });

const taskNotFound = () =>
  new NotFoundException({ code: 'TASK_NOT_FOUND', message: 'Task not found' });

const itemLocked = () =>
  new ForbiddenException({
    code: 'ITEM_LOCKED',
    message:
      'The Docs & Files root and project folders cannot be renamed, moved or deleted',
  });

const projectArchived = () =>
  new ForbiddenException({
    code: 'PROJECT_ARCHIVED',
    message: 'Archived projects are read-only',
  });

const nameRequired = () =>
  new BadRequestException({
    code: 'NAME_REQUIRED',
    message: 'A name is required',
  });

const fileRequired = () =>
  new BadRequestException({
    code: 'FILE_REQUIRED',
    message: 'Send the file in the "file" field',
  });
