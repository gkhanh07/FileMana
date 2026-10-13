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

  // The only origin the browser may call the API from (CORS, credentials).
  @IsString()
  WEB_ORIGIN: string = 'http://localhost:3000';

  // true behind HTTPS (production); false for plain http://localhost.
  // Read the raw value: implicit conversion would already have turned the string 'false' into true.
  @Transform(
    ({ obj }: { obj: Record<string, unknown> }) =>
      String(obj.COOKIE_SECURE).toLowerCase() === 'true',
  )
  @IsBoolean()
  COOKIE_SECURE: boolean = false;

  // Uploaded files live here (a Docker volume in production), never in the database.
  @IsString()
  UPLOAD_DIR: string = 'uploads';
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
