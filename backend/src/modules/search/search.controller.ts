import { Controller, Get, Query } from '@nestjs/common';
import { SearchQuery, SearchResultDto } from './search.dto';
import { SearchService } from './search.service';

// FR-SEARCH-01..06: the ⌘K palette.
@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  find(@Query() query: SearchQuery): Promise<SearchResultDto> {
    return this.search.search(query.q);
  }
}
