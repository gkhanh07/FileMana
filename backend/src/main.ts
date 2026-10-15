import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  // NFR-15: JSON logs on stdout.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  // Behind Caddy in production: take the client IP from X-Forwarded-For, but only when the
  // request comes from a private-network proxy, so the sign-in rate limit stays per IP (NFR-04).
  app.set('trust proxy', 'loopback, uniquelocal');
  setupApp(app);
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
void bootstrap();
