import { Module } from '@nestjs/common';
import { ItemsModule } from '../items/items.module';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

@Module({
  imports: [ItemsModule],
  controllers: [CommentsController],
  providers: [CommentsService],
})
export class CommentsModule {}
