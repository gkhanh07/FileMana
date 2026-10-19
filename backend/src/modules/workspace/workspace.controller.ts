import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceDto } from './workspace.dto';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  get(): Promise<WorkspaceDto> {
    return this.prisma.workspace.findFirstOrThrow({
      select: { name: true, timezone: true, weekStartsOn: true },
    });
  }
}
