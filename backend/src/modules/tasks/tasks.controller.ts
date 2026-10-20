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
import {
  ActivityPageDto,
  CreateTaskDto,
  DoneTasksDto,
  MyTaskDto,
  PageQuery,
  TaskDetailDto,
  TaskDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

const Id = (name = 'id') =>
  Param(name, new ParseUUIDPipe({ errorHttpStatusCode: 404 }));

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('projects/:id/tasks')
  list(@Id() projectId: string): Promise<TaskDto[]> {
    return this.tasks.list(projectId);
  }

  @Get('me/tasks')
  mine(@CurrentUser() user: AuthUser): Promise<MyTaskDto[]> {
    return this.tasks.mine(user.id);
  }

  @Get('projects/:id/tasks/done')
  listOlderDone(
    @Id() projectId: string,
    @Query() query: PageQuery,
  ): Promise<DoneTasksDto> {
    return this.tasks.listOlderDone(projectId, query.offset, query.limit);
  }

  @Post('tasks')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.create(user.id, dto);
  }

  @Get('tasks/:key')
  detail(@Param('key') key: string): Promise<TaskDetailDto> {
    return this.tasks.detail(key);
  }

  @Get('tasks/:id/activity')
  activity(
    @Id() id: string,
    @Query() query: PageQuery,
  ): Promise<ActivityPageDto> {
    return this.tasks.activity(id, query.offset, query.limit);
  }

  @Patch('tasks/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.update(user.id, id, dto);
  }

  @Delete('tasks/:id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Id() id: string): Promise<void> {
    return this.tasks.remove(user.id, id);
  }

  @Post('tasks/:id/restore')
  @HttpCode(200)
  restore(@CurrentUser() user: AuthUser, @Id() id: string): Promise<TaskDto> {
    return this.tasks.restore(user.id, id);
  }
}
