import { Controller, MessageEvent, Req, Sse } from '@nestjs/common';
import type { Request } from 'express';
import {
  concatMap,
  filter,
  interval,
  map,
  merge,
  Observable,
  share,
  takeUntil,
} from 'rxjs';
import { AuthService, SESSION_COOKIE } from '../auth/auth.service';
import { EventsService } from './events.service';

export const HEARTBEAT_MS = 25_000;

@Controller('events')
export class EventsController {
  constructor(
    private readonly events: EventsService,
    private readonly auth: AuthService,
  ) {}

  /** Tells the client something changed; it refetches what it shows. */
  @Sse()
  stream(@Req() req: Request): Observable<MessageEvent> {
    const token = (req.cookies as Record<string, string>)[SESSION_COOKIE];
    // The guard checked the session once; the heartbeat ends the stream after logout, password reset or deactivation.
    const heartbeat = interval(HEARTBEAT_MS).pipe(
      concatMap(() => this.auth.authenticate(token)),
      share(),
    );
    return merge(
      this.events.changes.pipe(map(() => ({ data: 'change' }))),
      heartbeat.pipe(map(() => ({ type: 'ping', data: '' }))),
    ).pipe(takeUntil(heartbeat.pipe(filter((session) => !session))));
  }
}
