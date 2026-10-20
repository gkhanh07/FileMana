import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const IMAGE_FILE = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;

function imageExtension(b: Buffer): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')))
    return 'png';
  if (
    b.subarray(0, 4).toString() === 'RIFF' &&
    b.subarray(8, 12).toString() === 'WEBP'
  )
    return 'webp';
  return null;
}

export async function saveImage(
  dir: string,
  data: Buffer | undefined,
): Promise<string> {
  const ext = data && imageExtension(data);
  if (!data || !ext) {
    throw new BadRequestException({
      code: 'INVALID_IMAGE',
      message: 'Image must be a JPG, PNG or WebP file',
    });
  }
  const file = `${randomUUID()}.${ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, file), data);
  return file;
}

export function imagePath(dir: string, file: string): string {
  const path = join(dir, file);
  if (!IMAGE_FILE.test(file) || !existsSync(path)) {
    throw new NotFoundException();
  }
  return path;
}
