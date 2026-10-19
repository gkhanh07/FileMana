import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthGuard } from './common/guards/auth.guard';
import { validateEnv } from './config/env';
import { AuthModule } from './modules/auth/auth.module';
import { ClientErrorsController } from './modules/client-errors/client-errors.controller';
import { HealthController } from './modules/health/health.controller';
import { ItemsModule } from './modules/items/items.module';
import { MilestonesModule } from './modules/milestones/milestones.module';
import { CommentsModule } from './modules/comments/comments.module';
import { SearchModule } from './modules/search/search.module';
import { TrashModule } from './modules/trash/trash.module';
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
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        { ttl: 60_000, limit: config.get<number>('THROTTLE_LIMIT', 20) },
      ],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    ItemsModule,
    MilestonesModule,
    CommentsModule,
    SearchModule,
    TrashModule,
  ],
  controllers: [HealthController, WorkspaceController, ClientErrorsController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
