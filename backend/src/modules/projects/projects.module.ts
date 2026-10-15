import { Module } from '@nestjs/common';
import { FavoritesController, ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController, FavoritesController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
