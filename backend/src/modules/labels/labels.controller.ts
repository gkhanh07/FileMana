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
  CreateLabelDto,
  LabelSummaryDto,
  MergeLabelDto,
  UpdateLabelDto,
} from './labels.dto';
import { LabelsService } from './labels.service';

const Id = () => Param('id', new ParseUUIDPipe({ errorHttpStatusCode: 404 }));

@Controller('labels')
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Get()
  list(): Promise<LabelSummaryDto[]> {
    return this.labels.list();
  }

  @Post()
  create(@Body() dto: CreateLabelDto): Promise<LabelSummaryDto> {
    return this.labels.create(dto);
  }

  @Patch(':id')
  update(
    @Id() id: string,
    @Body() dto: UpdateLabelDto,
  ): Promise<LabelSummaryDto> {
    return this.labels.update(id, dto);
  }

  @Post(':id/merge')
  @HttpCode(200)
  merge(
    @Id() id: string,
    @Body() dto: MergeLabelDto,
  ): Promise<LabelSummaryDto> {
    return this.labels.merge(id, dto.targetId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Id() id: string): Promise<void> {
    return this.labels.remove(id);
  }
}
