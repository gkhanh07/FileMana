import { Module } from '@nestjs/common';
import {
  AvatarsController,
  MembersController,
  PeopleController,
  UsersController,
} from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [
    UsersController,
    AvatarsController,
    PeopleController,
    MembersController,
  ],
  providers: [UsersService],
})
export class UsersModule {}
