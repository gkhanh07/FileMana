import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './common/guards/auth.guard';
import { validateEnv } from './config/env';
import { AuthModule } from './modules/auth/auth.module';
import { ClientErrorsController } from './modules/client-errors/client-errors.controller';
import { HealthController } from './modules/health/health.controller';
import { ItemsModule } from './modules/items/items.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';
import { WorkspaceController } from './modules/workspace/workspace.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validate: validateEnv,
    }),
    // About 20 sign-in tries per minute per IP (NFR-04); only routes with ThrottlerGuard use it.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { ttl: 60_000, limit: config.get<number>('THROTTLE_LIMIT', 20) },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    ItemsModule,
    MilestonesModule,
  ],
  controllers: [HealthController, WorkspaceController, ClientErrorsController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
