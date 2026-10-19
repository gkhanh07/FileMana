import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';

export function setupApp(app: INestApplication) {
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: app.get(ConfigService).getOrThrow<string>('WEB_ORIGIN'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());
}
