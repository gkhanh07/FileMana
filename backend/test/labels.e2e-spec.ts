import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

type Label = { id: string; name: string; color: string; taskCount: number };
type Task = { id: string; key: string; labels: { name: string }[] };

describe('Labels (e2e)', () => {
  let app: INestApplication<App>;
  let cookie: string;
  let projectId: string;
  const http = () => request(app.getHttpServer());
  const as = <T extends request.Test>(r: T) => r.set('Cookie', cookie);
  const create = async (name: string, color = 'blue') =>
    (await as(http().post('/labels')).send({ name, color }).expect(201))
      .body as Label;
  const list = async () =>
    (await as(http().get('/labels')).expect(200)).body as Label[];
  const find = async (id: string) => (await list()).find((l) => l.id === id);
  const newTask = async (labelIds: string[]) =>
    (
      await as(http().post('/tasks'))
        .send({ projectId, title: 'Gắn nhãn', labelIds })
        .expect(201)
    ).body as Task;
  const getTask = async ({ key }: Task) =>
    (await as(http().get(`/tasks/${key}`)).expect(200)).body as Task;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    await app.get(PrismaService).user.create({
      data: {
        email: 'nhan@example.com',
        name: 'Nhân',
        passwordHash: await argon2.hash(PASSWORD),
      },
    });
    const res = await http()
      .post('/auth/login')
      .send({ email: 'nhan@example.com', password: PASSWORD })
      .expect(200);
    cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    const project = await as(http().post('/projects'))
      .send({ name: 'Nhãn', key: 'LBL' })
      .expect(201);
    projectId = (project.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, renames and recolors a label', async () => {
    const label = await create('  Infra ', 'teal');
    expect(label).toMatchObject({ name: 'Infra', color: 'teal', taskCount: 0 });
    await as(http().patch(`/labels/${label.id}`))
      .send({ name: 'Infrastructure', color: 'violet' })
      .expect(200)
      .expect((r) =>
        expect(r.body).toMatchObject({
          name: 'Infrastructure',
          color: 'violet',
        }),
      );
    expect(await find(label.id)).toMatchObject({ name: 'Infrastructure' });
  });

  it('rejects a duplicate name in any letter case and bad input', async () => {
    const label = await create('Backend');
    await as(http().post('/labels'))
      .send({ name: 'backend', color: 'blue' })
      .expect(409)
      .expect((r) =>
        expect((r.body as { code: string }).code).toBe('LABEL_NAME_TAKEN'),
      );
    const other = await create('Frontend');
    await as(http().patch(`/labels/${other.id}`))
      .send({ name: 'BACKEND' })
      .expect(409);
    await as(http().patch(`/labels/${label.id}`))
      .send({ name: 'backend' })
      .expect(200);
    for (const body of [
      { name: 'Ok', color: 'purple' },
      { name: 'x'.repeat(41), color: 'blue' },
      { name: '  ', color: 'blue' },
      { name: null, color: 'blue' },
    ]) {
      await as(http().post('/labels')).send(body).expect(400);
    }
    await as(http().patch(`/labels/${label.id}`))
      .send({ color: null })
      .expect(400);
    await http().get('/labels').expect(401);
  });

  it('merges a label into another, keeping one link per task', async () => {
    const a = await create('Merge A');
    const b = await create('Merge B');
    const both = await newTask([a.id, b.id]);
    const onlyA = await newTask([a.id]);
    await as(http().post(`/labels/${a.id}/merge`))
      .send({ targetId: b.id })
      .expect(200)
      .expect((r) => expect((r.body as Label).taskCount).toBe(2));
    expect(await find(a.id)).toBeUndefined();
    expect((await getTask(both)).labels).toEqual([
      expect.objectContaining({ name: 'Merge B' }),
    ]);
    expect((await getTask(onlyA)).labels).toEqual([
      expect.objectContaining({ name: 'Merge B' }),
    ]);
    await as(http().post(`/labels/${b.id}/merge`))
      .send({ targetId: b.id })
      .expect(400)
      .expect((r) =>
        expect((r.body as { code: string }).code).toBe('LABEL_MERGE_SELF'),
      );
  });

  it('counts only tasks that are not in Trash', async () => {
    const label = await create('Counted');
    await newTask([label.id]);
    const trashed = await newTask([label.id]);
    await as(http().delete(`/tasks/${trashed.id}`)).expect(204);
    expect(await find(label.id)).toMatchObject({ taskCount: 1 });
  });

  it('deletes a label and removes it from its tasks', async () => {
    const label = await create('Gone');
    const task = await newTask([label.id]);
    await as(http().delete(`/labels/${label.id}`)).expect(204);
    expect(await find(label.id)).toBeUndefined();
    expect((await getTask(task)).labels).toEqual([]);
  });

  it('returns 404 for an unknown label', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    await as(http().patch(`/labels/${missing}`))
      .send({ name: 'x' })
      .expect(404);
    await as(http().delete(`/labels/${missing}`)).expect(404);
    await as(http().delete('/labels/not-a-uuid')).expect(404);
    const label = await create('Real');
    await as(http().post(`/labels/${label.id}/merge`))
      .send({ targetId: missing })
      .expect(404)
      .expect((r) =>
        expect((r.body as { code: string }).code).toBe('LABEL_NOT_FOUND'),
      );
  });
});
