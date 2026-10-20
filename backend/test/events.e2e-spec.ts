import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { EventsService } from '../src/modules/events/events.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

describe('Events (e2e)', () => {
  let app: INestApplication<App>;
  let base: string;
  const http = () => request(app.getHttpServer());
  const login = async (email: string) =>
    (
      (await http().post('/auth/login').send({ email, password: PASSWORD }))
        .headers['set-cookie'] as unknown as string[]
    )[0];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.listen(0);
    base = await app.getUrl();
    const passwordHash = await argon2.hash(PASSWORD);
    await app.get(PrismaService).user.createMany({
      data: [
        { email: 'ev-a@example.com', name: 'Ev A', passwordHash },
        { email: 'ev-b@example.com', name: 'Ev B', passwordHash },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("streams other people's changes and stops when the client leaves", async () => {
    expect((await fetch(`${base}/events`)).status).toBe(401);

    const watcher = await login('ev-a@example.com');
    const editor = await login('ev-b@example.com');
    const abort = new AbortController();
    const res = await fetch(`${base}/events`, {
      headers: { Cookie: watcher.split(';')[0] },
      signal: abort.signal,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const reader = res.body!.getReader();
    const started = Date.now();
    await http()
      .patch('/me')
      .set('Cookie', editor)
      .send({ name: 'Ev B2' })
      .expect(200);
    let text = '';
    while (!text.includes('data: change')) {
      text += new TextDecoder().decode((await reader.read()).value);
    }
    expect(Date.now() - started).toBeLessThan(1000);

    abort.abort();
    await new Promise((r) => setTimeout(r, 100));
    expect(app.get(EventsService).changes.observed).toBe(false);
  });
});
