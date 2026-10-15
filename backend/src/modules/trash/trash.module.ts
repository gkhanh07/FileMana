import { Module } from '@nestjs/common';
import { ItemsModule } from '../items/items.module';
import { TasksModule } from '../tasks/tasks.module';
import { TrashController } from './trash.controller';
import { TrashService } from './trash.service';

@Module({
  imports: [ItemsModule, TasksModule],
  controllers: [TrashController],
  providers: [TrashService],
})
export class TrashModule {}
