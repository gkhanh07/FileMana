import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

describe('Members (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());
  const login = (email: string, password: string) =>
    http().post('/auth/login').send({ email, password });
  const cookieOf = (res: request.Response) =>
    (res.headers['set-cookie'] as unknown as string[])[0];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.user.create({
      data: {
        email: 'mem-an@example.com',
        name: 'An',
        passwordHash: await argon2.hash(PASSWORD),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('adds, edits and deletes members', async () => {
    const helper = cookieOf(await login('mem-an@example.com', PASSWORD));
    const as = (r: request.Test) => r.set('Cookie', helper);

    await http().post('/members').send({}).expect(401);
    await as(
      http()
        .post('/members')
        .send({ email: 'x', name: 'X', password: 'temporary-123' }),
    ).expect(400);
    const created = await as(
      http().post('/members').send({
        email: ' Mem-Moi@Example.com ',
        name: 'Mới',
        jobTitle: 'Designer',
        password: 'temporary-123',
      }),
    ).expect(201);
    const id = (created.body as { id: string }).id;
    expect(created.body).toMatchObject({
      email: 'mem-moi@example.com',
      name: 'Mới',
      jobTitle: 'Designer',
      status: 'ACTIVE',
      openTaskCount: 0,
    });
    await login('mem-moi@example.com', 'temporary-123').expect(200);
    const dup = await as(
      http().post('/members').send({
        email: 'mem-an@example.com',
        name: 'A',
        password: 'temporary-123',
      }),
    ).expect(409);
    expect(dup.body).toMatchObject({ code: 'MEMBER_EMAIL_TAKEN' });

    const edited = await as(
      http()
        .patch(`/members/${id}`)
        .send({ name: 'Mới 2', jobTitle: '', email: 'mem-moi2@example.com' }),
    ).expect(200);
    expect(edited.body).toMatchObject({
      name: 'Mới 2',
      jobTitle: null,
      email: 'mem-moi2@example.com',
    });
    await as(
      http().patch(`/members/${id}`).send({ email: 'mem-an@example.com' }),
    ).expect(409);
    await as(
      http()
        .patch('/members/00000000-0000-4000-8000-000000000000')
        .send({ name: 'Z' }),
    ).expect(404);

    const self = await as(http().get('/me'));
    const own = await as(
      http().delete(`/members/${(self.body as { id: string }).id}`),
    ).expect(400);
    expect(own.body).toMatchObject({ code: 'CANNOT_DELETE_SELF' });

    const owner = await prisma.user.create({
      data: { email: 'mem-owner@example.com', name: 'Owner' },
    });
    await prisma.project.create({
      data: { key: 'MEMO', name: 'Owned', color: 'blue', ownerId: owner.id },
    });
    const busy = await as(http().delete(`/members/${owner.id}`)).expect(409);
    expect(busy.body).toMatchObject({ code: 'MEMBER_HAS_HISTORY' });

    await as(http().delete(`/members/${id}`)).expect(204);
    await login('mem-moi2@example.com', 'temporary-123').expect(401);
    await as(http().delete(`/members/${id}`)).expect(404);
  });
});
