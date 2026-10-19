import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import { PageQuery } from '../tasks/dto/task.dto';
import { CommentsService } from './comments.service';
import {
  CommentDto,
  CommentsPageDto,
  CreateCommentDto,
  UpdateCommentDto,
} from './dto/comment.dto';

const Id = () => Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 }));

@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('tasks/:id/comments')
  list(
    @Id() taskId: string,
    @Query() query: PageQuery,
  ): Promise<CommentsPageDto> {
    return this.comments.list(taskId, query.offset, query.limit);
  }

  @Post('tasks/:id/comments')
  create(
    @CurrentUser() user: AuthUser,
    @Id() taskId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.comments.create(user.id, taskId, dto);
  }

  @Patch('comments/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentDto> {
    return this.comments.update(user.id, id, dto);
  }

  @Delete('comments/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Id() id: string): Promise<void> {
    return this.comments.remove(user.id, id);
  }

  @Post('comments/:id/restore')
  @HttpCode(200)
  restore(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
  ): Promise<CommentDto> {
    return this.comments.restore(user.id, id);
  }
}
