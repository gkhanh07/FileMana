import { Module } from '@nestjs/common';
import {
  AvatarsController,
  PeopleController,
  UsersController,
} from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, AvatarsController, PeopleController],
  providers: [UsersService],
})
export class UsersModule {}
