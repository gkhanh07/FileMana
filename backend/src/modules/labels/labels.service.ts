import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateLabelDto,
  LabelSummaryDto,
  UpdateLabelDto,
} from './dto/label.dto';

const SELECT = {
  id: true,
  name: true,
  color: true,
  _count: {
    select: {
      tasks: {
        where: { task: { deletedAt: null, project: { deletedAt: null } } },
      },
    },
  },
} as const;

const toDto = (l: {
  id: string;
  name: string;
  color: string;
  _count: { tasks: number };
}): LabelSummaryDto => ({
  id: l.id,
  name: l.name,
  color: l.color,
  taskCount: l._count.tasks,
});

const nameTaken = () =>
  new ConflictException({
    code: 'LABEL_NAME_TAKEN',
    message: 'A label with this name already exists',
  });

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<LabelSummaryDto[]> {
    const labels = await this.prisma.label.findMany({
      orderBy: { name: 'asc' },
      select: SELECT,
    });
    return labels.map(toDto);
  }

  async create(dto: CreateLabelDto): Promise<LabelSummaryDto> {
    await this.assertNameFree(dto.name);
    return toDto(
      await this.uniqueName(
        this.prisma.label.create({ data: dto, select: SELECT }),
      ),
    );
  }

  async update(id: string, dto: UpdateLabelDto): Promise<LabelSummaryDto> {
    await this.find(id);
    if (dto.name !== undefined) await this.assertNameFree(dto.name, id);
    return toDto(
      await this.uniqueName(
        this.prisma.label.update({
          where: { id },
          data: { name: dto.name, color: dto.color },
          select: SELECT,
        }),
      ),
    );
  }

  async merge(id: string, targetId: string): Promise<LabelSummaryDto> {
    if (id === targetId) {
      throw new BadRequestException({
        code: 'LABEL_MERGE_SELF',
        message: 'A label cannot be merged into itself',
      });
    }
    await Promise.all([this.find(id), this.find(targetId)]);
    await this.prisma.$transaction(async (tx) => {
      const links = await tx.taskLabel.findMany({
        where: { labelId: id },
        select: { taskId: true },
      });
      await tx.taskLabel.createMany({
        data: links.map(({ taskId }) => ({ taskId, labelId: targetId })),
        skipDuplicates: true,
      });
      await tx.label.delete({ where: { id } });
    });
    return toDto(
      await this.prisma.label.findUniqueOrThrow({
        where: { id: targetId },
        select: SELECT,
      }),
    );
  }

  async remove(id: string): Promise<void> {
    await this.find(id);
    await this.prisma.label.delete({ where: { id } });
  }

  private async find(id: string) {
    const label = await this.prisma.label.findUnique({ where: { id } });
    if (!label) {
      throw new NotFoundException({
        code: 'LABEL_NOT_FOUND',
        message: 'Label not found',
      });
    }
    return label;
  }

  private async assertNameFree(name: string, exceptId?: string) {
    const taken = await this.prisma.label.findFirst({
      where: {
        // Prisma sends insensitive equals as ILIKE without escaping, so `_` and `%` would match anything.
        name: {
          equals: name.replace(/[\\%_]/g, '\\$&'),
          mode: 'insensitive',
        },
        id: exceptId && { not: exceptId },
      },
      select: { id: true },
    });
    if (taken) throw nameTaken();
  }

  private async uniqueName<T>(query: Promise<T>): Promise<T> {
    try {
      return await query;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw nameTaken();
      }
      throw e;
    }
  }
}
