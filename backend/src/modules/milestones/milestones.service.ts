import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Milestone } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateMilestoneDto,
  MilestoneDto,
  UpdateMilestoneDto,
} from './dto/milestone.dto';

const toDate = (d: string) => new Date(`${d}T00:00:00Z`);

const notFound = () =>
  new NotFoundException({
    code: 'MILESTONE_NOT_FOUND',
    message: 'Milestone not found',
  });

@Injectable()
export class MilestonesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(projectId: string): Promise<MilestoneDto[]> {
    await this.findProject(projectId);
    const rows = await this.prisma.milestone.findMany({
      where: { projectId, deletedAt: null },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    });
    return this.toDtos(rows);
  }

  async create(
    projectId: string,
    dto: CreateMilestoneDto,
  ): Promise<MilestoneDto> {
    await this.findProject(projectId, true);
    const m = await this.prisma.milestone.create({
      data: { projectId, name: dto.name, date: toDate(dto.date) },
    });
    return { ...this.toDto(m), taskCount: 0, doneCount: 0 };
  }

  async update(id: string, dto: UpdateMilestoneDto): Promise<MilestoneDto> {
    await this.findWritable(id, null);
    const m = await this.prisma.milestone.update({
      where: { id },
      data: { name: dto.name, date: dto.date && toDate(dto.date) },
    });
    return (await this.toDtos([m]))[0];
  }

  async remove(id: string): Promise<void> {
    await this.findWritable(id, null);
    await this.prisma.milestone.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<MilestoneDto> {
    await this.findWritable(id, { not: null });
    const m = await this.prisma.milestone.update({
      where: { id },
      data: { deletedAt: null },
    });
    return (await this.toDtos([m]))[0];
  }

  private toDto(m: Milestone) {
    return {
      id: m.id,
      projectId: m.projectId,
      name: m.name,
      date: m.date.toISOString().slice(0, 10),
    };
  }

  private async toDtos(rows: Milestone[]): Promise<MilestoneDto[]> {
    const counts = await this.prisma.task.groupBy({
      by: ['milestoneId', 'status'],
      where: {
        milestoneId: { in: rows.map((m) => m.id) },
        deletedAt: null,
        parentId: null,
      },
      _count: true,
    });
    return rows.map((m) => {
      const mine = counts.filter((c) => c.milestoneId === m.id);
      return {
        ...this.toDto(m),
        taskCount: mine.reduce((n, c) => n + c._count, 0),
        doneCount: mine.find((c) => c.status === 'DONE')?._count ?? 0,
      };
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

  private async findWritable(id: string, deletedAt: null | { not: null }) {
    const m = await this.prisma.milestone.findFirst({
      where: { id, deletedAt, project: { deletedAt: null } },
      select: { project: { select: { archivedAt: true } } },
    });
    if (!m) throw notFound();
    if (m.project.archivedAt) throw projectArchived();
  }
}

const projectArchived = () =>
  new ForbiddenException({
    code: 'PROJECT_ARCHIVED',
    message: 'Archived projects are read-only',
  });
