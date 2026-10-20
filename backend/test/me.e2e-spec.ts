import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

describe('Me and workspace (e2e)', () => {
  let app: INestApplication<App>;
  let cookie: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    const prisma = app.get(PrismaService);
    await prisma.workspace.create({ data: { name: 'Mây Studio' } });
    await prisma.user.create({
      data: {
        email: 'binh@example.com',
        name: 'Bình',
        passwordHash: await argon2.hash(PASSWORD),
      },
    });
    const res = await http()
      .post('/auth/login')
      .send({ email: 'binh@example.com', password: PASSWORD });
    cookie = (res.headers['set-cookie'] as unknown as string[])[0];
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /workspace returns the name and date settings', async () => {
    await http().get('/workspace').set('Cookie', cookie).expect(200, {
      name: 'Mây Studio',
      logoUrl: null,
      timezone: 'Asia/Ho_Chi_Minh',
      weekStartsOn: 1,
    });
  });

  it('GET /workspace needs a session', async () => {
    await http().get('/workspace').expect(401);
  });

  it('PATCH /workspace saves the name and date settings', async () => {
    // Asia/Bangkok has the same offset as the default, so suites running in parallel see the same "today".
    const changed = {
      name: 'Mây Studio 2',
      logoUrl: null,
      timezone: 'Asia/Bangkok',
      weekStartsOn: 0,
    };
    await http()
      .patch('/workspace')
      .set('Cookie', cookie)
      .send({
        name: '  Mây Studio 2 ',
        timezone: 'Asia/Bangkok',
        weekStartsOn: 0,
      })
      .expect(200, changed);
    await http().get('/workspace').set('Cookie', cookie).expect(200, changed);
    await http()
      .patch('/workspace')
      .set('Cookie', cookie)
      .send({
        name: 'Mây Studio',
        timezone: 'Asia/Ho_Chi_Minh',
        weekStartsOn: 1,
      })
      .expect(200);
  });

  it('PATCH /workspace rejects a bad name, timezone or week start', async () => {
    for (const body of [
      { name: '  ' },
      { name: 'x'.repeat(81) },
      { timezone: 'Mars/Olympus' },
      { weekStartsOn: 3 },
    ]) {
      await http()
        .patch('/workspace')
        .set('Cookie', cookie)
        .send(body)
        .expect(400);
    }
    await http().patch('/workspace').send({ name: 'x' }).expect(401);
  });

  it('PUT /workspace/logo stores an image that needs a session to load', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const res = await http()
      .put('/workspace/logo')
      .set('Cookie', cookie)
      .attach('file', png, 'logo.png')
      .expect(200);
    const { logoUrl } = res.body as { logoUrl: string };
    expect(logoUrl).toMatch(/^\/workspace\/logo\/[0-9a-f-]{36}\.png$/);
    await http()
      .get(logoUrl)
      .set('Cookie', cookie)
      .expect(200)
      .expect('Content-Type', 'image/png');
    await http().get(logoUrl).expect(401);

    await http()
      .put('/workspace/logo')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('hello'), 'logo.txt')
      .expect(400)
      .expect((r) =>
        expect((r.body as { code: string }).code).toBe('INVALID_IMAGE'),
      );
    await http()
      .put('/workspace/logo')
      .set('Cookie', cookie)
      .attach(
        'file',
        Buffer.concat([png, Buffer.alloc(2 * 1024 * 1024)]),
        'big.png',
      )
      .expect(413);

    await http()
      .delete('/workspace/logo')
      .set('Cookie', cookie)
      .expect(200)
      .expect((r) => expect((r.body as { logoUrl: null }).logoUrl).toBeNull());
    await http().get(logoUrl).set('Cookie', cookie).expect(404);
    await http()
      .get('/workspace/logo/..%2F..%2Fpackage.json')
      .set('Cookie', cookie)
      .expect(404);
  });

  it('PATCH /me saves the theme and /me returns it', async () => {
    const res = await http()
      .patch('/me')
      .set('Cookie', cookie)
      .send({ theme: 'dark' })
      .expect(200);
    expect((res.body as { theme: string }).theme).toBe('dark');
    const me = await http().get('/me').set('Cookie', cookie).expect(200);
    expect((me.body as { theme: string }).theme).toBe('dark');
  });

  it('PATCH /me rejects an unknown theme or field', async () => {
    await http()
      .patch('/me')
      .set('Cookie', cookie)
      .send({ theme: 'blue' })
      .expect(400);
    await http()
      .patch('/me')
      .set('Cookie', cookie)
      .send({ email: 'x@example.com' })
      .expect(400);
  });

  it('POST /client-errors logs a browser error for a signed-in user', async () => {
    await http()
      .post('/client-errors')
      .set('Cookie', cookie)
      .send({
        message: 'boom',
        stack: 'at x',
        url: 'http://localhost/projects',
      })
      .expect(204);
    await http()
      .post('/client-errors')
      .send({ message: 'boom', url: '/' })
      .expect(401);
    await http()
      .post('/client-errors')
      .set('Cookie', cookie)
      .send({ message: 'x'.repeat(1001), url: '/' })
      .expect(400);
  });
});
