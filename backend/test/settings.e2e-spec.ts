import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const EMAIL = 'chi@example.com';
const PASSWORD = 'correct-horse-battery';
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

type Me = { name: string; jobTitle: string | null; avatarUrl: string | null };

describe('Personal settings (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  const signIn = async (password = PASSWORD) => {
    const res = await http()
      .post('/auth/login')
      .send({ email: EMAIL, password })
      .expect(200);
    return (res.headers['set-cookie'] as unknown as string[])[0];
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    await app.get(PrismaService).user.create({
      data: {
        email: EMAIL,
        name: 'Chi',
        passwordHash: await argon2.hash(PASSWORD),
      },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /me saves name and job title; an empty job title clears it', async () => {
    const cookie = await signIn();
    const res = await http()
      .patch('/me')
      .set('Cookie', cookie)
      .send({ name: '  Trần Chi  ', jobTitle: 'Thiết kế' })
      .expect(200);
    expect(res.body).toMatchObject({ name: 'Trần Chi', jobTitle: 'Thiết kế' });
    const cleared = await http()
      .patch('/me')
      .set('Cookie', cookie)
      .send({ jobTitle: '' })
      .expect(200);
    expect((cleared.body as Me).jobTitle).toBeNull();
    await http()
      .patch('/me')
      .set('Cookie', cookie)
      .send({ name: '   ' })
      .expect(400);
  });

  it('avatar: upload, serve to signed-in users only, replace, remove', async () => {
    const cookie = await signIn();
    const up = await http()
      .put('/me/avatar')
      .set('Cookie', cookie)
      .attach('file', PNG, 'me.png')
      .expect(200);
    const url = (up.body as Me).avatarUrl!;
    expect(url).toMatch(/^\/avatars\/[0-9a-f-]{36}\.png$/);
    await http()
      .get(url)
      .set('Cookie', cookie)
      .expect(200)
      .expect('Content-Type', 'image/png');
    await http().get(url).expect(401);

    const again = await http()
      .put('/me/avatar')
      .set('Cookie', cookie)
      .attach('file', PNG, 'me.png')
      .expect(200);
    expect((again.body as Me).avatarUrl).not.toBe(url);
    await http().get(url).set('Cookie', cookie).expect(404); // old file is gone

    const removed = await http()
      .delete('/me/avatar')
      .set('Cookie', cookie)
      .expect(200);
    expect((removed.body as Me).avatarUrl).toBeNull();
  });

  it('avatar: rejects non-images and files over 2 MB', async () => {
    const cookie = await signIn();
    const bad = await http()
      .put('/me/avatar')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('<svg></svg>'), {
        filename: 'x.png',
        contentType: 'image/png',
      })
      .expect(400);
    expect((bad.body as { code: string }).code).toBe('INVALID_IMAGE');
    const big = Buffer.concat([PNG, Buffer.alloc(2 * 1024 * 1024)]);
    const tooBig = await http()
      .put('/me/avatar')
      .set('Cookie', cookie)
      .attach('file', big, 'big.png')
      .expect(413);
    expect((tooBig.body as { code: string }).code).toBe('FILE_TOO_LARGE');
    await http()
      .get('/avatars/..%2F..%2Fpackage.json')
      .set('Cookie', cookie)
      .expect(404);
  });

  it('DELETE /me/sessions signs out other devices but not this one', async () => {
    const mine = await signIn();
    const other = await signIn();
    await http().delete('/me/sessions').set('Cookie', mine).expect(204);
    await http().get('/me').set('Cookie', mine).expect(200);
    await http().get('/me').set('Cookie', other).expect(401);
  });

  it('POST /me/password needs the current password and signs out other devices', async () => {
    const mine = await signIn();
    const other = await signIn();
    const wrong = await http()
      .post('/me/password')
      .set('Cookie', mine)
      .send({ currentPassword: 'nope', newPassword: 'new-password-1' })
      .expect(400);
    expect((wrong.body as { code: string }).code).toBe('WRONG_PASSWORD');
    await http()
      .post('/me/password')
      .set('Cookie', mine)
      .send({ currentPassword: PASSWORD, newPassword: 'short' })
      .expect(400);

    await http()
      .post('/me/password')
      .set('Cookie', mine)
      .send({ currentPassword: PASSWORD, newPassword: 'new-password-1' })
      .expect(204);
    await http().get('/me').set('Cookie', mine).expect(200);
    await http().get('/me').set('Cookie', other).expect(401);
    await http()
      .post('/auth/login')
      .send({ email: EMAIL, password: PASSWORD })
      .expect(401);
    await signIn('new-password-1');
  });
});
