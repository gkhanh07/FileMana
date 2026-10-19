import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const http = () => request(app.getHttpServer());

  const login = (email: string, password: string, remember?: boolean) =>
    http().post('/auth/login').send({ email, password, remember });

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

    const passwordHash = await argon2.hash(PASSWORD);
    await prisma.user.createMany({
      data: [
        { email: 'an@example.com', name: 'An', passwordHash },
        {
          email: 'off@example.com',
          name: 'Off',
          passwordHash,
          status: 'DEACTIVATED',
        },
      ],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health is public', async () => {
    await http().get('/health').expect(200, { status: 'ok' });
  });

  it('rejects a request with no session in the standard error shape', async () => {
    await http().get('/me').expect(401, {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
      message: 'Not signed in',
    });
  });

  it('validates the sign-in body', async () => {
    const res = await login('not-an-email', '').expect(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
    });
  });

  it('signs in with a session cookie and never leaks the hash', async () => {
    const res = await login('AN@example.com ', PASSWORD).expect(200);
    expect(res.body as unknown).toEqual({
      id: expect.any(String) as string,
      email: 'an@example.com',
      name: 'An',
      theme: 'system',
      jobTitle: null,
      avatarUrl: null,
    });
    const cookie = cookieOf(res);
    expect(cookie).toMatch(/^sid=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).not.toMatch(/Secure/); // COOKIE_SECURE=false in the test env
    expect(cookie).not.toMatch(/Expires=/); // browser-session cookie

    const me = await http().get('/me').set('Cookie', cookie).expect(200);
    expect((me.body as { email: string }).email).toBe('an@example.com');
    expect(JSON.stringify(me.body)).not.toMatch(/password/i);
  });

  it('"remember me" gives a 30-day cookie', async () => {
    const res = await login('an@example.com', PASSWORD, true).expect(200);
    const expires = /Expires=([^;]+)/.exec(cookieOf(res))![1];
    const days = (Date.parse(expires) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('re-issues a remembered cookie on later requests, but not an unticked one', async () => {
    const remembered = cookieOf(await login('an@example.com', PASSWORD, true));
    const again = await http().get('/me').set('Cookie', remembered).expect(200);
    expect(String(again.headers['set-cookie'])).toMatch(/Expires=/);

    const plain = cookieOf(await login('an@example.com', PASSWORD));
    const res = await http().get('/me').set('Cookie', plain).expect(200);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('ends an unticked session after 24 hours on the server', async () => {
    const cookie = cookieOf(await login('an@example.com', PASSWORD));
    await prisma.session.updateMany({
      where: { remember: false, user: { email: 'an@example.com' } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await http().get('/me').set('Cookie', cookie).expect(401);
  });

  it('answers wrong password and unknown email the same way, with no lockout', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await login('an@example.com', 'wrong').expect(401);
      expect(res.body).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    }
    const unknown = await login('nobody@example.com', 'wrong').expect(401);
    expect(unknown.body).toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await login('an@example.com', PASSWORD).expect(200);
  });

  it('refuses a deactivated account', async () => {
    await login('off@example.com', PASSWORD).expect(401);
  });

  it('signs out: the old cookie stops working', async () => {
    const cookie = cookieOf(await login('an@example.com', PASSWORD));
    await http().post('/auth/logout').set('Cookie', cookie).expect(204);
    await http().get('/me').set('Cookie', cookie).expect(401);
  });

  it('signing out with no or an expired session still succeeds and clears the cookie', async () => {
    const res = await http().post('/auth/logout').expect(204);
    expect(String(res.headers['set-cookie'])).toMatch(/sid=;/);
  });

  it('signs up into the workspace with a session; the email must be free', async () => {
    const signUp = (body: object) => http().post('/auth/signup').send(body);
    const res = await signUp({
      email: ' Moi@Example.com',
      name: '  Mới  ',
      password: 'new-password-1',
    }).expect(201);
    expect(res.body).toMatchObject({ email: 'moi@example.com', name: 'Mới' });
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    await http().get('/me').set('Cookie', cookieOf(res)).expect(200);
    await login('moi@example.com', 'new-password-1').expect(200);

    const taken = await signUp({
      email: 'an@example.com',
      name: 'X',
      password: 'new-password-1',
    }).expect(409);
    expect(taken.body).toMatchObject({ code: 'EMAIL_TAKEN' });
    await signUp({
      email: 'x@example.com',
      name: ' ',
      password: 'short',
    }).expect(400);
    await signUp({
      email: 'x@example.com',
      name: 'X',
      password: 'new-password-1',
      role: 'ADMIN',
    }).expect(400);
  });

  it('lists members; another member resets a password and signs them out everywhere', async () => {
    const passwordHash = await argon2.hash(PASSWORD);
    const quen = await prisma.user.create({
      data: { email: 'quen@example.com', name: 'Quên', passwordHash },
    });
    const helper = cookieOf(await login('an@example.com', PASSWORD));
    const before = cookieOf(await login('quen@example.com', PASSWORD, true));

    const list = await http().get('/members').set('Cookie', helper).expect(200);
    const row = (list.body as { email: string }[]).find(
      (m) => m.email === 'quen@example.com',
    );
    expect(row).toEqual({
      id: quen.id,
      name: 'Quên',
      email: 'quen@example.com',
      jobTitle: null,
      avatarUrl: null,
      status: 'ACTIVE',
      openTaskCount: 0,
    });
    await http().get('/members').expect(401);

    const reset = (id: string, password: string) =>
      http()
        .post(`/members/${id}/password`)
        .set('Cookie', helper)
        .send({ password });
    await reset(quen.id, 'short').expect(400);
    await reset(quen.id, 'temporary-123').expect(204);
    await http().get('/me').set('Cookie', before).expect(401);
    await login('quen@example.com', PASSWORD).expect(401);
    await login('quen@example.com', 'temporary-123').expect(200);

    const self = await http().get('/me').set('Cookie', helper);
    const own = await reset((self.body as { id: string }).id, 'temporary-123');
    expect(own.status).toBe(400);
    expect(own.body).toMatchObject({ code: 'CANNOT_RESET_SELF' });
    await reset('abc', 'temporary-123').expect(404);
    const missing = await reset(
      '00000000-0000-4000-8000-000000000000',
      'temporary-123',
    ).expect(404);
    expect(missing.body).toMatchObject({ code: 'MEMBER_NOT_FOUND' });
  });

  it('rate-limits sign-in per IP (last: it exhausts the limiter)', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      statuses.push((await login('an@example.com', 'wrong')).status);
    }
    expect(statuses).toContain(429);
    const res = await login('an@example.com', 'wrong');
    expect(res.body).toMatchObject({
      statusCode: 429,
      code: 'TOO_MANY_REQUESTS',
    });
  });
});
