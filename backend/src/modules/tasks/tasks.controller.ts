import {
  Body,
  Controller,
  Get,
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
  CreateTaskDto,
  DoneTasksDto,
  DoneTasksQuery,
  LabelDto,
  TaskDto,
  UpdateTaskDto,
} from './dto/task.dto';
import { TasksService } from './tasks.service';

// A malformed id is just a row that doesn't exist.
const Id = (name = 'id') =>
  Param(name, new ParseUUIDPipe({ errorHttpStatusCode: 404 }));

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('projects/:id/tasks')
  list(@Id() projectId: string): Promise<TaskDto[]> {
    return this.tasks.list(projectId);
  }

  @Get('projects/:id/tasks/done')
  listOlderDone(
    @Id() projectId: string,
    @Query() query: DoneTasksQuery,
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

  @Patch('tasks/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
    @Body() dto: UpdateTaskDto,
  ): Promise<TaskDto> {
    return this.tasks.update(user.id, id, dto);
  }

  @Get('labels')
  labels(): Promise<LabelDto[]> {
    return this.tasks.labels();
  }
}
