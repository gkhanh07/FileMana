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
  Put,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../../common/decorators/current-user.decorator';
import {
  AddMemberDto,
  CreateProjectDto,
  DeleteProjectDto,
  FavoriteDto,
  ProjectDto,
  ReorderFavoritesDto,
  UpdateProjectDto,
} from './dto/project.dto';
import { ProjectsService } from './projects.service';

// A malformed id is just a project that doesn't exist.
const Id = (name = 'id') =>
  Param(name, new ParseUUIDPipe({ errorHttpStatusCode: 404 }));

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  // FR-PRJ-01/02: every project, archived included; the page filters, searches and sorts.
  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ProjectDto[]> {
    return this.projects.list(user.id);
  }

  // FR-PRJ-03
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectDto> {
    return this.projects.create(user.id, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Id() id: string): Promise<ProjectDto> {
    return this.projects.get(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectDto> {
    return this.projects.update(user.id, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
  ): Promise<ProjectDto> {
    return this.projects.archive(user.id, id);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
  ): Promise<ProjectDto> {
    return this.projects.restore(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
    @Body() dto: DeleteProjectDto,
  ): Promise<void> {
    return this.projects.remove(user.id, id, dto.name);
  }

  @Post(':id/members')
  @HttpCode(200)
  addMember(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
    @Body() dto: AddMemberDto,
  ): Promise<ProjectDto> {
    return this.projects.addMember(user.id, id, dto.userId);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
    @Id('userId') memberId: string,
  ): Promise<ProjectDto> {
    return this.projects.removeMember(user.id, id, memberId);
  }
}

// FR-SHELL-03: the current user's pinned projects, in their order.
@Controller('me/favorites')
export class FavoritesController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<FavoriteDto[]> {
    return this.projects.favorites(user.id);
  }

  @Put()
  reorder(
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderFavoritesDto,
  ): Promise<FavoriteDto[]> {
    return this.projects.reorder(user.id, dto.projectIds);
  }

  @Put(':id')
  pin(@CurrentUser() user: AuthUser, @Id() id: string): Promise<FavoriteDto[]> {
    return this.projects.pin(user.id, id);
  }

  @Delete(':id')
  unpin(
    @CurrentUser() user: AuthUser,
    @Id() id: string,
  ): Promise<FavoriteDto[]> {
    return this.projects.unpin(user.id, id);
  }
}
