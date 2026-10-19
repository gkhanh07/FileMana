import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { createWriteStream, mkdirSync, rm } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream';
import { catchError } from 'rxjs';

export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export const filesDir = (config: ConfigService) =>
  resolve(config.getOrThrow<string>('UPLOAD_DIR'), 'files');

export type StoredFile = {
  originalname: string;
  mimetype: string;
  filename: string; // a fresh UUID: the item's id and its name on disk
  path: string;
  size: number;
};

type Done = (err: Error | null, info?: Partial<StoredFile>) => void;

export function fileStorage(dir: string) {
  mkdirSync(dir, { recursive: true });
  return {
    _handleFile(_req: unknown, file: { stream: Readable }, cb: Done) {
      const filename = randomUUID();
      const path = join(dir, filename);
      const out = createWriteStream(path);
      pipeline(file.stream, out, (err) => {
        if (!err) return cb(null, { filename, path, size: out.bytesWritten });
        rm(path, { force: true }, () => cb(err));
      });
    },
    _removeFile(_req: unknown, file: { path: string }, cb: Done) {
      rm(file.path, { force: true }, cb);
    },
  };
}

@Injectable()
export class RemoveUploadOnError implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<{ file?: StoredFile }>();
    return next.handle().pipe(
      catchError(async (e: unknown) => {
        if (req.file) await unlink(req.file.path).catch(() => undefined);
        throw e;
      }),
    );
  }
}
