import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
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

// What can hold other items.
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

// Not in Trash, and neither is its project or its parent task.
const aliveTask = (id: string) =>
  ({
    id,
    deletedAt: null,
    project: { deletedAt: null },
    OR: [{ parentId: null }, { parent: { deletedAt: null } }],
  }) satisfies Prisma.TaskWhereInput;

// The parents from the root down to `id`, or null if one of them (or the project) is in Trash.
function chain(parents: Map<string, Parent>, id: string): Parent[] | null {
  const path: Parent[] = [];
  for (let cur: string | null = id; cur;) {
    const p = parents.get(cur);
    // Missing means in Trash. Seen twice means a loop, which moves are locked to prevent.
    if (!p || path.includes(p)) return null;
    path.unshift(p);
    cur = p.parentId;
  }
  return path[0]?.project?.deletedAt ? null : path;
}

// NFR-05: file links stop working after 1–2 hours. Rounded to the hour, so a file keeps the same
// URL (and stays in the browser cache) for an hour. ponytail: a per-process key, so links also
// stop working when the API restarts; the page then fetches new ones.
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

// A project folder shows the project's current name; General keeps its stored one.
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
  // Multer reads the name as UTF-8 (defParamCharset), so Vietnamese names arrive intact.
  name: singleLine(file.originalname).slice(0, 255) || file.filename,
  mimeType: file.mimetype.slice(0, 255),
  size: file.size,
  parentId,
  creatorId: userId,
});

// No roles (FR-ROLE-03): everyone sees and may change every item, except in archived projects.
@Injectable()
export class ItemsService {
  readonly filesDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.filesDir = filesDir(config);
  }

  // FR-FILE-01: the Docs & Files page is the General root's contents; the root itself never shows.
  async library(): Promise<ItemDetailDto> {
    const root = await this.prisma.item.findFirstOrThrow({
      where: { parentId: null, projectId: null },
      select: { id: true },
    });
    return this.detail(root.id);
  }

  // The move picker's top level: General first, then one folder per project (archived ones too, read-only).
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

  // FR-FILE-01: a project's Docs & Files tab.
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

  // FR-FILE-03/04: folders, then files, each by name; a quick filter and a name search.
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
        // Prisma passes % and _ through as LIKE wildcards; a search for "100%" means the text.
        name: query.q
          ? {
              contains: query.q.replace(/[\\%_]/g, '\\$&'),
              mode: 'insensitive',
            }
          : undefined,
      },
      include,
      // The enum's order is folders, then files.
      orderBy: [{ kind: 'asc' }, { name: 'asc' }, { id: 'asc' }],
      skip: offset,
      take: limit + 1,
    });
    return {
      items: rows.slice(0, limit).map(toDto),
      hasMore: rows.length > limit,
    };
  }

  // FR-FILE-07
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

  // FR-FILE-05
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

  // FR-TASK-18: a file dropped on a task goes into its project's folder and onto the task.
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

  // FR-TASK-18: oldest first. Few per task, so not paged.
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
    // A file moved into a folder that is now in Trash is hidden with it.
    const parents = await this.parents(this.prisma);
    return rows
      .filter((r) => r.parentId && chain(parents, r.parentId))
      .map(toDto);
  }

  // Rename or move (FR-FILE-07/08).
  async update(id: string, dto: UpdateItemDto): Promise<ItemDetailDto> {
    const { item, project } = await this.find(id);
    if (project?.archivedAt) throw projectArchived();
    const renames = dto.name !== undefined && dto.name !== item.name;
    const moves = dto.parentId !== undefined && dto.parentId !== item.parentId;
    if ((renames || moves) && !item.parentId) throw itemLocked();
    if (dto.name === '') throw nameRequired();

    await this.prisma.$transaction(async (tx) => {
      if (moves) {
        // Two moves at once could each pass the check below and together make a loop.
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

  // FR-ROLE-04: to Trash for 30 days; a folder's contents go with it.
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

  // NFR-05: only through a signed, unexpired link, and only while the file can still be seen.
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

  // An item not in Trash, with the folders above it, root first; its project is the root's.
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

  // Where a new or moved item goes: a folder that can be seen and changed, General if left out.
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

  // ponytail: every folder in one query, walked in memory; fine for thousands, a recursive CTE
  // beyond that.
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

// FR-FILE-07
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
