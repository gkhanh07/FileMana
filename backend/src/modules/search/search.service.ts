import { Injectable } from '@nestjs/common';
import { fold } from '../../common/fold';
import { PrismaService } from '../../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { PERSON_SELECT, toPerson } from '../users/dto/person.dto';
import { SearchResultDto } from './search.dto';

const TAKE = 5;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly items: ItemsService,
  ) {}

  async search(query: string): Promise<SearchResultDto> {
    const q = fold(query.trim());
    if (!q) return { tasks: [], projects: [], items: [], members: [] };
    const recent = { orderBy: { updatedAt: 'desc' } } as const;
    const [tasks, projects, items, users] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          deletedAt: null,
          project: { deletedAt: null },
          OR: [{ parentId: null }, { parent: { deletedAt: null } }],
        },
        select: {
          id: true,
          number: true,
          title: true,
          status: true,
          updatedAt: true,
          project: { select: { key: true, name: true } },
        },
        ...recent,
      }),
      this.prisma.project.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          archivedAt: true,
          updatedAt: true,
        },
        ...recent,
      }),
      this.items.search(q, TAKE),
      this.prisma.user.findMany({
        where: { status: 'ACTIVE' },
        ...PERSON_SELECT,
        orderBy: { name: 'asc' },
      }),
    ]);
    const match = (s: string) => fold(s).includes(q);
    return {
      tasks: tasks
        .map((t) => ({ ...t, key: `${t.project.key}-${t.number}` }))
        .filter((t) => match(`${t.key} ${t.title}`))
        .slice(0, TAKE)
        .map((t) => ({
          id: t.id,
          key: t.key,
          title: t.title,
          status: t.status,
          project: t.project.name,
          updatedAt: t.updatedAt,
        })),
      projects: projects
        .filter((p) => match(p.name))
        .slice(0, TAKE)
        .map(({ archivedAt, ...p }) => ({ ...p, archived: !!archivedAt })),
      items,
      members: users
        .filter((u) => match(u.name))
        .slice(0, TAKE)
        .map(toPerson),
    };
  }
}
