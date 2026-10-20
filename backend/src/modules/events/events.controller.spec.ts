import type { MessageEvent } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthService } from '../auth/auth.service';
import { EventsController, HEARTBEAT_MS } from './events.controller';
import { EventsService } from './events.service';

describe('EventsController.stream', () => {
  afterEach(() => jest.useRealTimers());

  it('sends changes and pings, and ends once the session is gone', async () => {
    jest.useFakeTimers();
    const authenticate = jest
      .fn()
      .mockResolvedValueOnce({ user: {} })
      .mockResolvedValueOnce(null);
    const events = new EventsService();
    const controller = new EventsController(events, {
      authenticate,
    } as unknown as AuthService);
    const received: MessageEvent[] = [];
    let done = false;
    controller
      .stream({ cookies: { sid: 'token' } } as unknown as Request)
      .subscribe({
        next: (e) => received.push(e),
        complete: () => (done = true),
      });

    events.changes.next();
    await jest.advanceTimersByTimeAsync(HEARTBEAT_MS);
    expect(received).toEqual([{ data: 'change' }, { type: 'ping', data: '' }]);
    expect(done).toBe(false);

    await jest.advanceTimersByTimeAsync(HEARTBEAT_MS);
    expect(authenticate).toHaveBeenCalledWith('token');
    expect(done).toBe(true);
    expect(events.changes.observed).toBe(false);
  });
});
