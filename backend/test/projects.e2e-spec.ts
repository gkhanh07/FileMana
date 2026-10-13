import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

type Person = { id: string; name: string };
type Project = {
  id: string;
  key: string;
  name: string;
  color: string;
  status: string;
  dueDate: string | null;
  owner: Person;
  members: Person[];
  archivedAt: string | null;
  pinned: boolean;
};

// FR-PRJ-01..11, FR-ROLE-02/03, FR-SHELL-03, FR-ACT-01/02
describe('Projects (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cookie: string;
  let me: Person;
  let other: Person;
  const http = () => request(app.getHttpServer());
  const create = (body: object) =>
    http().post('/projects').set('Cookie', cookie).send(body);
  const newProject = async (name: string, key: string) =>
    (await create({ name, key }).expect(201)).body as Project;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const passwordHash = await argon2.hash(PASSWORD);
    me = await prisma.user.create({
      data: { email: 'phong@example.com', name: 'Phong', passwordHash },
    });
    other = await prisma.user.create({
      data: { email: 'quan@example.com', name: 'Quân', passwordHash },
    });
    const res = await http()
      .post('/auth/login')
      .send({ email: 'phong@example.com', password: PASSWORD })
      .expect(200);
    cookie = (res.headers['set-cookie'] as unknown as string[])[0];
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates with only a name and key; defaults the rest and logs it', async () => {
    const res = await create({ name: '  Thiết kế web  ', key: 'TKW' }).expect(
      201,
    );
    const p = res.body as Project;
    expect(p).toMatchObject({
      name: 'Thiết kế web',
      key: 'TKW',
      status: 'PLANNING',
      owner: { id: me.id },
      members: [{ id: me.id }],
      archivedAt: null,
      pinned: false,
    });
    expect(p.color).toEqual(expect.any(String));
    const log = await prisma.activity.findMany({ where: { projectId: p.id } });
    expect(log).toMatchObject([{ actorId: me.id, action: 'project.created' }]);
  });

  it('rejects a taken key, a bad key, a long name and no session', async () => {
    const taken = await create({ name: 'Khác', key: 'TKW' }).expect(409);
    expect(taken.body).toMatchObject({ code: 'PROJECT_KEY_TAKEN' });
    await create({ name: 'X', key: 'tk' }).expect(400);
    await create({ name: 'X', key: 'ABCDEF' }).expect(400);
    await create({ name: 'x'.repeat(81), key: 'LONG' }).expect(400);
    await create({ name: 'X', key: 'XY', dueDate: '2026-02-30' }).expect(400);
    await http().get('/projects').expect(401);
  });

  it('edits fields; a new owner becomes a member; dates stay calendar dates', async () => {
    const p = await newProject('Ứng dụng', 'UD');
    const res = await http()
      .patch(`/projects/${p.id}`)
      .set('Cookie', cookie)
      .send({ status: 'ACTIVE', ownerId: other.id, dueDate: '2026-10-30' })
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'ACTIVE',
      dueDate: '2026-10-30',
      owner: { id: other.id },
      members: [{ id: other.id }, { id: me.id }],
    });
    const cleared = await http()
      .patch(`/projects/${p.id}`)
      .set('Cookie', cookie)
      .send({ dueDate: null })
      .expect(200);
    expect((cleared.body as Project).dueDate).toBeNull();
    // The key can't be changed after creation.
    await http()
      .patch(`/projects/${p.id}`)
      .set('Cookie', cookie)
      .send({ key: 'NEW' })
      .expect(400);
  });

  it('adds and removes members; the owner cannot be removed', async () => {
    const { id } = await newProject('Thành viên', 'TV');
    const added = await http()
      .post(`/projects/${id}/members`)
      .set('Cookie', cookie)
      .send({ userId: other.id })
      .expect(200);
    expect((added.body as Project).members.map((m) => m.id)).toEqual([
      me.id,
      other.id,
    ]);
    const owner = await http()
      .delete(`/projects/${id}/members/${me.id}`)
      .set('Cookie', cookie)
      .expect(400);
    expect(owner.body).toMatchObject({ code: 'CANNOT_REMOVE_OWNER' });
    const removed = await http()
      .delete(`/projects/${id}/members/${other.id}`)
      .set('Cookie', cookie)
      .expect(200);
    expect((removed.body as Project).members).toHaveLength(1);
    const actions = await prisma.activity.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'asc' },
      select: { action: true },
    });
    expect(actions.map((a) => a.action)).toEqual([
      'project.created',
      'member.added',
      'member.removed',
    ]);
  });

  it('archived projects are read-only until restored', async () => {
    const { id } = await newProject('Lưu trữ', 'LT');
    const archived = await http()
      .post(`/projects/${id}/archive`)
      .set('Cookie', cookie)
      .expect(200);
    expect((archived.body as Project).archivedAt).not.toBeNull();
    const writes = [
      () => http().patch(`/projects/${id}`).send({ name: 'Mới' }),
      () => http().post(`/projects/${id}/members`).send({ userId: other.id }),
      () => http().post(`/projects/${id}/archive`),
    ];
    for (const write of writes) {
      const res = await write().set('Cookie', cookie).expect(403);
      expect(res.body).toMatchObject({ code: 'PROJECT_ARCHIVED' });
    }
    await http()
      .post(`/projects/${id}/restore`)
      .set('Cookie', cookie)
      .expect(200);
    await http()
      .patch(`/projects/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'Mới' })
      .expect(200);
  });

  it('deletes only when the typed name matches; then it is gone', async () => {
    const { id } = await newProject('Xóa tôi', 'XT');
    const wrong = await http()
      .delete(`/projects/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'Xoa toi' })
      .expect(400);
    expect(wrong.body).toMatchObject({ code: 'NAME_MISMATCH' });
    await http()
      .delete(`/projects/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'Xóa tôi' })
      .expect(204);
    await http().get(`/projects/${id}`).set('Cookie', cookie).expect(404);
    await http().get('/projects/not-a-uuid').set('Cookie', cookie).expect(404);
    const list = await http().get('/projects').set('Cookie', cookie);
    expect((list.body as Project[]).some((p) => p.id === id)).toBe(false);
    // Soft delete: the row stays for Trash.
    expect(await prisma.project.findUnique({ where: { id } })).not.toBeNull();
  });

  it('pins up to 5 favorites, refuses the 6th, reorders and unpins', async () => {
    const ids: string[] = [];
    for (const key of ['FA', 'FB', 'FC', 'FD', 'FE', 'FF']) {
      const { id } = await newProject(`Ghim ${key}`, key);
      ids.push(id);
    }
    for (const id of ids.slice(0, 5)) {
      await http().put(`/me/favorites/${id}`).set('Cookie', cookie).expect(200);
    }
    const full = await http()
      .put(`/me/favorites/${ids[5]}`)
      .set('Cookie', cookie)
      .expect(409);
    expect(full.body).toMatchObject({ code: 'FAVORITES_FULL' });

    const reversed = ids.slice(0, 5).reverse();
    const res = await http()
      .put('/me/favorites')
      .set('Cookie', cookie)
      .send({ projectIds: reversed })
      .expect(200);
    expect((res.body as Project[]).map((p) => p.id)).toEqual(reversed);
    const detail = await http()
      .get(`/projects/${ids[0]}`)
      .set('Cookie', cookie)
      .expect(200);
    expect((detail.body as Project).pinned).toBe(true);

    const after = await http()
      .delete(`/me/favorites/${ids[4]}`)
      .set('Cookie', cookie)
      .expect(200);
    expect((after.body as Project[]).map((p) => p.id)).toEqual(
      reversed.slice(1),
    );
  });

  it('lists people for the member picker', async () => {
    const res = await http().get('/users').set('Cookie', cookie).expect(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        { id: me.id, name: 'Phong', avatarUrl: null },
        { id: other.id, name: 'Quân', avatarUrl: null },
      ]),
    );
  });
});
