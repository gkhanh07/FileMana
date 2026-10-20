import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UpdateWorkspaceDto, WorkspaceDto } from './workspace.dto';
import { WorkspaceService } from './workspace.service';

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly workspace: WorkspaceService) {}

  @Get()
  get(): Promise<WorkspaceDto> {
    return this.workspace.get();
  }

  @Patch()
  update(@Body() dto: UpdateWorkspaceDto): Promise<WorkspaceDto> {
    return this.workspace.update(dto);
  }

  @Put('logo')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: LOGO_MAX_BYTES } }),
  )
  setLogo(
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ): Promise<WorkspaceDto> {
    return this.workspace.setLogo(file?.buffer);
  }

  @Delete('logo')
  removeLogo(): Promise<WorkspaceDto> {
    return this.workspace.removeLogo();
  }

  @Get('logo/:file')
  logo(@Param('file') file: string, @Res() res: Response): void {
    const path = this.workspace.logoPath(file);
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cache-Control', 'private, max-age=31536000, immutable');
    res.sendFile(path);
  }
}
