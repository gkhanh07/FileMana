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

  // "sid=abc; Path=/; HttpOnly" -> "sid=abc"
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
      where: { remember: false },
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
