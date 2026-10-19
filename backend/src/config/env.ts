import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export class Env {
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3001;

  @IsString()
  DATABASE_URL: string;

  @IsString()
  WEB_ORIGIN: string = 'http://localhost:3000';

  @Transform(
    ({ obj }: { obj: Record<string, unknown> }) =>
      String(obj.COOKIE_SECURE).toLowerCase() === 'true',
  )
  @IsBoolean()
  COOKIE_SECURE: boolean = false;

  @IsString()
  UPLOAD_DIR: string = 'uploads';

  @IsInt()
  @Min(1)
  THROTTLE_LIMIT: number = 20;
}

export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { enableImplicitConversion: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    throw new Error(
      `Invalid environment: ${errors.flatMap((e) => Object.values(e.constraints ?? {})).join('; ')}`,
    );
  }
  return env;
}
