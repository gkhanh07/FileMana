import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { AppModule } from './app.module';

async function main() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ logLevels: ['error'] }),
  });
  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('FileMana API').build(),
  );
  writeFileSync('openapi.json', JSON.stringify(doc, null, 2));
  await app.close();
}
void main();
