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

// FR-FILE-05
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

// Uploaded files: UPLOAD_DIR/files/<item id>.
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

// A multer storage engine that streams to <dir>/<uuid>, so a 100 MB upload never sits in memory.
// Multer calls _removeFile itself when the size limit is hit or another part of the request fails.
export function fileStorage(dir: string) {
  mkdirSync(dir, { recursive: true });
  return {
    _handleFile(_req: unknown, file: { stream: Readable }, cb: Done) {
      const filename = randomUUID();
      const path = join(dir, filename);
      const out = createWriteStream(path);
      pipeline(file.stream, out, (err) => {
        if (!err) return cb(null, { filename, path, size: out.bytesWritten });
        // A write that failed (the client went away) never reaches multer, so remove it here.
        rm(path, { force: true }, () => cb(err));
      });
    },
    _removeFile(_req: unknown, file: { path: string }, cb: Done) {
      rm(file.path, { force: true }, cb);
    },
  };
}

// The file is on disk before the handler runs, so a request that fails afterwards (bad id,
// archived project, database error) deletes it again instead of leaving it orphaned.
@Injectable()
export class RemoveUploadOnError implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<{ file?: StoredFile }>();
    return next.handle().pipe(
      // Removed before the error response goes out.
      catchError(async (e: unknown) => {
        if (req.file) await unlink(req.file.path).catch(() => undefined);
        throw e;
      }),
    );
  }
}
