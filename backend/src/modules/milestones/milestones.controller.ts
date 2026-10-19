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
} from '@nestjs/common';
import {
  CreateMilestoneDto,
  MilestoneDto,
  UpdateMilestoneDto,
} from './dto/milestone.dto';
import { MilestonesService } from './milestones.service';

const Id = () => Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 }));

@Controller()
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get('projects/:id/milestones')
  list(@Id() projectId: string): Promise<MilestoneDto[]> {
    return this.milestones.list(projectId);
  }

  @Post('projects/:id/milestones')
  create(
    @Id() projectId: string,
    @Body() dto: CreateMilestoneDto,
  ): Promise<MilestoneDto> {
    return this.milestones.create(projectId, dto);
  }

  @Patch('milestones/:id')
  update(
    @Id() id: string,
    @Body() dto: UpdateMilestoneDto,
  ): Promise<MilestoneDto> {
    return this.milestones.update(id, dto);
  }

  @Delete('milestones/:id')
  @HttpCode(204)
  remove(@Id() id: string): Promise<void> {
    return this.milestones.remove(id);
  }

  @Post('milestones/:id/restore')
  @HttpCode(200)
  restore(@Id() id: string): Promise<MilestoneDto> {
    return this.milestones.restore(id);
  }
}
