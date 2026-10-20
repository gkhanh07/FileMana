import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { tap } from 'rxjs';
import { EventsService } from './events.service';

/** Every successful write tells open pages to refetch (NFR-14). */
@Injectable()
export class ChangesInterceptor implements NestInterceptor {
  constructor(private readonly events: EventsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler) {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.method === 'GET' || req.path.startsWith('/client-errors')) {
      return next.handle();
    }
    return next.handle().pipe(tap(() => this.events.changes.next()));
  }
}
