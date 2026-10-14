import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { extname } from 'node:path';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import {
  ChildrenQuery,
  CreateItemDto,
  ItemDetailDto,
  ItemDto,
  ItemsPageDto,
  RawQuery,
  RootDto,
  UpdateItemDto,
  UploadQuery,
} from './dto/item.dto';
import { ItemsService } from './items.service';
import { RemoveUploadOnError, type StoredFile } from './upload';

// A malformed id is just an item that doesn't exist.
const Id = (name = 'id') =>
  Param(name, new ParseUUIDPipe({ errorHttpStatusCode: 404 }));

// FR-FILE-12: what the browser may open itself (the PDF frame, an image or video in a new tab).
// Everything else downloads, so an uploaded HTML or SVG page never runs on the API's origin.
// Text and code previews read the file with fetch, which ignores this.
const INLINE = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.avif',
  '.bmp',
  '.mp4',
  '.webm',
  '.ogv',
  '.mov',
  '.m4v',
]);

@Controller()
export class ItemsController {
  private readonly webOrigin: string;

  constructor(
    private readonly items: ItemsService,
    config: ConfigService,
  ) {
    this.webOrigin = config.getOrThrow<string>('WEB_ORIGIN');
  }

  // FR-FILE-01. Before items/:id, which would otherwise take these as ids.
  @Get('items/library')
  library(): Promise<ItemDetailDto> {
    return this.items.library();
  }

  @Get('items/roots')
  roots(): Promise<RootDto[]> {
    return this.items.roots();
  }

  @Get('items/:id')
  detail(@Id() id: string): Promise<ItemDetailDto> {
    return this.items.detail(id);
  }

  @Get('items/:id/children')
  children(
    @Id() id: string,
    @Query() query: ChildrenQuery,
  ): Promise<ItemsPageDto> {
    return this.items.children(id, query);
  }

  @Post('items')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateItemDto,
  ): Promise<ItemDto> {
    return this.items.create(user.id, dto);
  }

  // FR-FILE-05: multipart field `file`, one file per request; the web app sends several at once.
  @Post('items/files')
  @UseInterceptors(FileInterceptor('file'), RemoveUploadOnError)
  upload(
    @CurrentUser() user: AuthUser,
    @Query() query: UploadQuery,
    @UploadedFile() file: StoredFile | undefined,
  ): Promise<ItemDto> {
    return this.items.upload(user.id, query.parentId, file);
  }

  @Patch('items/:id')
  update(@Id() id: string, @Body() dto: UpdateItemDto): Promise<ItemDetailDto> {
    return this.items.update(id, dto);
  }

  @Delete('items/:id')
  @HttpCode(204)
  remove(@Id() id: string): Promise<void> {
    return this.items.remove(id);
  }

  // Undo of a delete.
  @Post('items/:id/restore')
  @HttpCode(200)
  restore(@Id() id: string): Promise<ItemDto> {
    return this.items.restore(id);
  }

  // NFR-05: the signed link from an item's url, on top of the session cookie every route needs.
  @Get('items/:id/raw')
  async raw(
    @Id() id: string,
    @Query() query: RawQuery,
    @Res() res: Response,
  ): Promise<void> {
    const { name, dir } = await this.items.rawFile(id, query.exp, query.sig);
    res.attachment(name);
    if (!query.dl && INLINE.has(extname(name).toLowerCase())) {
      const disposition = String(res.getHeader('Content-Disposition'));
      res.setHeader(
        'Content-Disposition',
        disposition.replace(/^attachment/, 'inline'),
      );
      // The web app shows PDFs in a frame; helmet's defaults allow only this origin.
      res.setHeader(
        'Content-Security-Policy',
        `frame-ancestors ${this.webOrigin}`,
      );
      res.removeHeader('X-Frame-Options');
    } else {
      res.type('application/octet-stream');
    }
    // The web app is another origin in development; helmet's default would block it.
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.sendFile(id, { root: dir, cacheControl: false }, (err) => {
      if (err && !res.headersSent) res.status(404).end();
    });
  }

  // FR-FILE-01: a project's Docs & Files tab.
  @Get('projects/:id/folder')
  projectFolder(@Id() projectId: string): Promise<ItemDetailDto> {
    return this.items.projectFolder(projectId);
  }

  // FR-TASK-18: multipart field `file`, like items/files.
  @Post('tasks/:id/attachments')
  @UseInterceptors(FileInterceptor('file'), RemoveUploadOnError)
  attach(
    @CurrentUser() user: AuthUser,
    @Id() taskId: string,
    @UploadedFile() file: StoredFile | undefined,
  ): Promise<ItemDto> {
    return this.items.attach(user.id, taskId, file);
  }

  @Get('tasks/:id/attachments')
  attachments(@Id() taskId: string): Promise<ItemDto[]> {
    return this.items.attachments(taskId);
  }
}
