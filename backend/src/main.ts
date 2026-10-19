import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  app.set('trust proxy', 'loopback, uniquelocal');
  setupApp(app);
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
void bootstrap();
