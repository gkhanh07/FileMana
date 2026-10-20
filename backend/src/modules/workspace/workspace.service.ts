import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { imagePath, saveImage } from '../../common/image';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateWorkspaceDto, WorkspaceDto } from './workspace.dto';

const SELECT = {
  name: true,
  logoFile: true,
  timezone: true,
  weekStartsOn: true,
} as const;

const toDto = (w: {
  name: string;
  logoFile: string | null;
  timezone: string;
  weekStartsOn: number;
}): WorkspaceDto => ({
  name: w.name,
  logoUrl: w.logoFile ? `/workspace/logo/${w.logoFile}` : null,
  timezone: w.timezone,
  weekStartsOn: w.weekStartsOn,
});

@Injectable()
export class WorkspaceService {
  private readonly logoDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.logoDir = resolve(config.getOrThrow<string>('UPLOAD_DIR'), 'logo');
  }

  async get(): Promise<WorkspaceDto> {
    return toDto(
      await this.prisma.workspace.findFirstOrThrow({ select: SELECT }),
    );
  }

  async update(dto: UpdateWorkspaceDto): Promise<WorkspaceDto> {
    const { id } = await this.prisma.workspace.findFirstOrThrow({
      select: { id: true },
    });
    return toDto(
      await this.prisma.workspace.update({
        where: { id },
        data: {
          name: dto.name,
          timezone: dto.timezone,
          weekStartsOn: dto.weekStartsOn,
        },
        select: SELECT,
      }),
    );
  }

  async setLogo(data: Buffer | undefined): Promise<WorkspaceDto> {
    return this.replaceLogo(await saveImage(this.logoDir, data));
  }

  removeLogo(): Promise<WorkspaceDto> {
    return this.replaceLogo(null);
  }

  logoPath(file: string): string {
    return imagePath(this.logoDir, file);
  }

  private async replaceLogo(file: string | null): Promise<WorkspaceDto> {
    const { id, logoFile: old } = await this.prisma.workspace.findFirstOrThrow({
      select: { id: true, logoFile: true },
    });
    const workspace = await this.prisma.workspace.update({
      where: { id },
      data: { logoFile: file },
      select: SELECT,
    });
    if (old) await rm(join(this.logoDir, old), { force: true });
    return toDto(workspace);
  }
}
