import { Module } from '@nestjs/common';
import { AvatarsController, UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, AvatarsController],
  providers: [UsersService],
})
export class UsersModule {}
