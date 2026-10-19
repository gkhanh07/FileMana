import { Body, Controller, HttpCode, Logger, Post } from '@nestjs/common';
import {
  type AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { ClientErrorDto } from './client-error.dto';

@Controller('client-errors')
export class ClientErrorsController {
  private readonly logger = new Logger('Browser');

  @Post()
  @HttpCode(204)
  report(@CurrentUser() user: AuthUser, @Body() dto: ClientErrorDto): void {
    this.logger.error({ userId: user.id, ...dto });
  }
}
