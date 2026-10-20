import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ChangesInterceptor } from './changes.interceptor';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  controllers: [EventsController],
  providers: [
    EventsService,
    { provide: APP_INTERCEPTOR, useClass: ChangesInterceptor },
  ],
})
export class EventsModule {}
