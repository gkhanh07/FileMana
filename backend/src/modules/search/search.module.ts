import { Module } from '@nestjs/common';
import { ItemsModule } from '../items/items.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [ItemsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
