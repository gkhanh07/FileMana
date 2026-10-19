import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { PageQuery } from '../tasks/dto/task.dto';
import { TrashPageDto, TrashType } from './trash.dto';
import { TrashService } from './trash.service';

const Type = () =>
  Param('type', new ParseEnumPipe(TrashType, { errorHttpStatusCode: 404 }));
const Id = () => Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 }));

@Controller('trash')
export class TrashController {
  constructor(private readonly trash: TrashService) {}

  @Get()
  list(@Query() query: PageQuery): Promise<TrashPageDto> {
    return this.trash.list(query.offset, query.limit);
  }

  @Post(':type/:id/restore')
  @HttpCode(204)
  restore(
    @CurrentUser() user: AuthUser,
    @Type() type: TrashType,
    @Id() id: string,
  ): Promise<void> {
    return this.trash.restore(user.id, type, id);
  }

  @Delete(':type/:id')
  @HttpCode(204)
  purge(@Type() type: TrashType, @Id() id: string): Promise<void> {
    return this.trash.purge(type, id);
  }
}
