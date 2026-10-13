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
      timezone: 'Asia/Ho_Chi_Minh',
      weekStartsOn: 1,
    });
  });

  it('GET /workspace needs a session', async () => {
    await http().get('/workspace').expect(401);
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
