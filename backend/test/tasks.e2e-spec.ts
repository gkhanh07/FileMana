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
type Task = {
  id: string;
  key: string;
  number: number;
  title: string;
  status: string;
  priority: string;
  assignee: Person | null;
  dueDate: string | null;
  dueTime: string | null;
  completedAt: string | null;
  labels: { id: string; name: string }[];
};

// FR-TASK-01..05/21..23, FR-PRJ-04, FR-ACT-01..03
describe('Tasks (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cookie: string;
  let me: Person;
  let other: Person;
  let projectId: string;
  const http = () => request(app.getHttpServer());
  const post = (body: object) =>
    http().post('/tasks').set('Cookie', cookie).send(body);
  const patch = (id: string, body: object) =>
    http().patch(`/tasks/${id}`).set('Cookie', cookie).send(body);
  const newTask = async (title: string, extra: object = {}) =>
    (await post({ projectId, title, ...extra }).expect(201)).body as Task;
  const taskLog = (targetId: string) =>
    prisma.activity.findMany({
      where: { targetId, action: { not: 'task.created' } },
      orderBy: { createdAt: 'asc' },
    });

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
      data: { email: 'tam@example.com', name: 'Tâm', passwordHash },
    });
    other = await prisma.user.create({
      data: { email: 'uyen@example.com', name: 'Uyên', passwordHash },
    });
    const res = await http()
      .post('/auth/login')
      .send({ email: 'tam@example.com', password: PASSWORD })
      .expect(200);
    cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    const project = await http()
      .post('/projects')
      .set('Cookie', cookie)
      .send({ name: 'Công việc', key: 'CV' })
      .expect(201);
    projectId = (project.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates with only a title: numbered key, defaults, assigned to the creator, logged', async () => {
    const a = await newTask('  Viết đặc tả  ');
    const b = await newTask('Vẽ màn hình');
    expect(a).toMatchObject({
      key: 'CV-1',
      title: 'Viết đặc tả',
      status: 'TODO',
      priority: 'MEDIUM',
      assignee: { id: me.id },
      dueDate: null,
      completedAt: null,
      labels: [],
    });
    expect(b.key).toBe('CV-2');
    const log = await prisma.activity.findFirst({
      where: { targetId: a.id, action: 'task.created' },
    });
    expect(log).toMatchObject({ actorId: me.id, projectId });
  });

  it('numbers concurrent creates without gaps or duplicates', async () => {
    const tasks = await Promise.all(
      Array.from({ length: 5 }, (_, i) => newTask(`Song song ${i}`)),
    );
    const numbers = tasks.map((t) => t.number).sort((x, y) => x - y);
    expect(new Set(numbers).size).toBe(5);
    expect(numbers[4] - numbers[0]).toBe(4);
  });

  it('takes assignee null, a due date with time, and labels', async () => {
    const label = await prisma.label.upsert({
      where: { name: 'Bug' },
      update: {},
      create: { name: 'Bug', color: 'red' },
    });
    const t = await newTask('Sửa lỗi', {
      assigneeId: null,
      priority: 'URGENT',
      dueDate: '2026-10-15',
      dueTime: '14:30',
      labelIds: [label.id],
    });
    expect(t).toMatchObject({
      assignee: null,
      priority: 'URGENT',
      dueDate: '2026-10-15',
      dueTime: '14:30',
      labels: [{ name: 'Bug' }],
    });
    const labels = await http()
      .get('/labels')
      .set('Cookie', cookie)
      .expect(200);
    expect(labels.body).toContainEqual(
      expect.objectContaining({ name: 'Bug' }),
    );
  });

  it('rejects bad input', async () => {
    await post({ projectId, title: '   ' }).expect(400);
    await post({ projectId, title: 'x'.repeat(201) }).expect(400);
    await post({ projectId, title: 'Giờ', dueTime: '09:00' })
      .expect(400)
      .expect((r) =>
        expect(r.body).toMatchObject({ code: 'DUE_TIME_WITHOUT_DATE' }),
      );
    await post({ projectId, title: 'Ai', assigneeId: crypto.randomUUID() })
      .expect(404)
      .expect((r) => expect(r.body).toMatchObject({ code: 'USER_NOT_FOUND' }));
    await post({ projectId: crypto.randomUUID(), title: 'Đâu' })
      .expect(404)
      .expect((r) =>
        expect(r.body).toMatchObject({ code: 'PROJECT_NOT_FOUND' }),
      );
    const t = await newTask('Không rỗng');
    await patch(t.id, { title: null }).expect(400);
    await patch(t.id, { status: null }).expect(400);
    await patch(crypto.randomUUID(), { title: 'Mất' })
      .expect(404)
      .expect((r) => expect(r.body).toMatchObject({ code: 'TASK_NOT_FOUND' }));
  });

  it('edits one field at a time; Done sets completedAt and leaving Done clears it', async () => {
    const t = await newTask('Duyệt');
    const done = (await patch(t.id, { status: 'DONE' }).expect(200))
      .body as Task;
    expect(done.completedAt).toEqual(expect.any(String));
    const back = (await patch(t.id, { status: 'REVIEW' }).expect(200))
      .body as Task;
    expect(back.completedAt).toBeNull();
    const assigned = (await patch(t.id, { assigneeId: other.id }).expect(200))
      .body as Task;
    expect(assigned.assignee).toMatchObject({ id: other.id, name: 'Uyên' });
    await patch(t.id, { dueDate: '2026-11-01', dueTime: '08:00' }).expect(200);
    const cleared = (await patch(t.id, { dueDate: null }).expect(200))
      .body as Task;
    expect(cleared).toMatchObject({ dueDate: null, dueTime: null });
  });

  it('merges quick changes to the same field and drops a change that was undone (FR-ACT-03)', async () => {
    const t = await newTask('Gộp');
    await patch(t.id, { priority: 'HIGH' }).expect(200);
    await patch(t.id, { priority: 'URGENT' }).expect(200);
    let log = await taskLog(t.id);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({
      action: 'task.priority',
      oldValue: 'MEDIUM',
      newValue: 'URGENT',
    });

    await patch(t.id, { priority: 'MEDIUM' }).expect(200);
    expect(await taskLog(t.id)).toHaveLength(0);

    // A different field in between starts a new entry.
    await patch(t.id, { status: 'IN_PROGRESS' }).expect(200);
    await patch(t.id, { priority: 'LOW' }).expect(200);
    await patch(t.id, { status: 'REVIEW' }).expect(200);
    log = await taskLog(t.id);
    expect(log.map((l) => l.action)).toEqual([
      'task.status',
      'task.priority',
      'task.status',
    ]);

    // Older than 5 minutes: a new entry.
    await prisma.activity.updateMany({
      where: { targetId: t.id },
      data: { createdAt: new Date(Date.now() - 6 * 60 * 1000) },
    });
    await patch(t.id, { status: 'DONE' }).expect(200);
    expect(await taskLog(t.id)).toHaveLength(4);
  });

  it('lists recent tasks; Done older than 14 days only through "See all"', async () => {
    const old = await newTask('Xong lâu rồi', { status: 'DONE' });
    await prisma.task.update({
      where: { id: old.id },
      data: { completedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
    });
    const recent = await newTask('Vừa xong', { status: 'DONE' });
    const list = (
      await http()
        .get(`/projects/${projectId}/tasks`)
        .set('Cookie', cookie)
        .expect(200)
    ).body as Task[];
    const ids = list.map((t) => t.id);
    expect(ids).toContain(recent.id);
    expect(ids).not.toContain(old.id);

    const page = await http()
      .get(`/projects/${projectId}/tasks/done?limit=1`)
      .set('Cookie', cookie)
      .expect(200);
    expect(page.body).toMatchObject({
      items: [{ id: old.id }],
      hasMore: false,
    });
    await http()
      .get(`/projects/${projectId}/tasks/done?limit=1000`)
      .set('Cookie', cookie)
      .expect(400);
  });

  it('counts progress on the project (FR-PRJ-04)', async () => {
    const res = await http()
      .get(`/projects/${projectId}`)
      .set('Cookie', cookie)
      .expect(200);
    const total = await prisma.task.count({ where: { projectId } });
    const done = await prisma.task.count({
      where: { projectId, status: 'DONE' },
    });
    expect(res.body).toMatchObject({ taskCount: total, doneCount: done });
    expect(done).toBeGreaterThan(0);
  });

  it('rejects writes to tasks of an archived project (FR-ROLE-02)', async () => {
    const t = await newTask('Đóng băng');
    await http()
      .post(`/projects/${projectId}/archive`)
      .set('Cookie', cookie)
      .expect(200);
    await patch(t.id, { title: 'Không được' })
      .expect(403)
      .expect((r) =>
        expect(r.body).toMatchObject({ code: 'PROJECT_ARCHIVED' }),
      );
    await post({ projectId, title: 'Không được' }).expect(403);
    await http()
      .get(`/projects/${projectId}/tasks`)
      .set('Cookie', cookie)
      .expect(200);
  });

  it('needs a session', async () => {
    await http().get(`/projects/${projectId}/tasks`).expect(401);
    await http().post('/tasks').send({ projectId, title: 'x' }).expect(401);
  });
});
