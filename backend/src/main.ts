import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  // NFR-15: JSON logs on stdout.
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true }),
  });
  setupApp(app);
  await app.listen(app.get(ConfigService).getOrThrow<number>('PORT'));
}
void bootstrap();
