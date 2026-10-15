import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

type Milestone = {
  id: string;
  name: string;
  date: string;
  taskCount: number;
  doneCount: number;
};
type Task = { id: string; key: string; milestoneId: string | null };

// FR-PRJ-07, FR-PRJ-08
describe('Milestones and project overview (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cookie: string;
  let projectId: string;
  const http = () => request(app.getHttpServer());
  const as = <T extends request.Test>(r: T) => r.set('Cookie', cookie);
  const newTask = async (title: string, extra: object = {}) =>
    (
      await as(http().post('/tasks'))
        .send({ projectId, title, ...extra })
        .expect(201)
    ).body as Task;
  const milestones = async () =>
    (await as(http().get(`/projects/${projectId}/milestones`)).expect(200))
      .body as Milestone[];

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
        email: 'moc@example.com',
        name: 'Mộc',
        passwordHash: await argon2.hash(PASSWORD),
      },
    });
    const res = await http()
      .post('/auth/login')
      .send({ email: 'moc@example.com', password: PASSWORD })
      .expect(200);
    cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    const project = await as(http().post('/projects'))
      .send({ name: 'Cột mốc', key: 'MOC' })
      .expect(201);
    projectId = (project.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates, lists soonest first, edits, deletes and restores', async () => {
    const late = (
      await as(http().post(`/projects/${projectId}/milestones`))
        .send({ name: '  Ra mắt  ', date: '2026-12-01' })
        .expect(201)
    ).body as Milestone;
    expect(late).toMatchObject({
      name: 'Ra mắt',
      date: '2026-12-01',
      taskCount: 0,
      doneCount: 0,
    });
    await as(http().post(`/projects/${projectId}/milestones`))
      .send({ name: 'Bản thử', date: '2026-11-01' })
      .expect(201);
    expect((await milestones()).map((m) => m.name)).toEqual([
      'Bản thử',
      'Ra mắt',
    ]);

    await as(http().post(`/projects/${projectId}/milestones`))
      .send({ name: '', date: '2026-02-30' })
      .expect(400);
    await as(http().patch(`/milestones/${late.id}`))
      .send({ name: null })
      .expect(400);
    const edited = await as(http().patch(`/milestones/${late.id}`))
      .send({ date: '2026-10-20' })
      .expect(200);
    expect(edited.body).toMatchObject({ name: 'Ra mắt', date: '2026-10-20' });

    await as(http().delete(`/milestones/${late.id}`)).expect(204);
    expect((await milestones()).map((m) => m.name)).toEqual(['Bản thử']);
    await as(http().delete(`/milestones/${late.id}`)).expect(404);
    await as(http().post(`/milestones/${late.id}/restore`)).expect(200);
    expect(await milestones()).toHaveLength(2);
  });

  it('links tasks, counts progress from them and logs the change', async () => {
    const m = (
      await as(http().post(`/projects/${projectId}/milestones`))
        .send({ name: 'Thiết kế', date: '2026-10-30' })
        .expect(201)
    ).body as Milestone;
    const a = await newTask('Phác thảo', { milestoneId: m.id });
    expect(a.milestoneId).toBe(m.id);
    const b = await newTask('Duyệt');
    await as(http().patch(`/tasks/${b.id}`))
      .send({ milestoneId: m.id, status: 'DONE' })
      .expect(200);
    // A subtask doesn't count.
    await newTask('Con', { parentId: b.id, milestoneId: m.id });
    expect((await milestones()).find((x) => x.id === m.id)).toMatchObject({
      taskCount: 2,
      doneCount: 1,
    });
    const log = await prisma.activity.findFirst({
      where: { targetId: b.id, action: 'task.milestone' },
    });
    expect(log?.newValue).toEqual({ id: m.id, name: 'Thiết kế' });

    // Deleting the milestone keeps the link for Undo, but a deleted one can't be picked.
    await as(http().delete(`/milestones/${m.id}`)).expect(204);
    await as(http().patch(`/tasks/${a.id}`))
      .send({ milestoneId: m.id })
      .expect(404)
      .expect(({ body }) =>
        expect((body as { code: string }).code).toBe('MILESTONE_NOT_FOUND'),
      );
    await as(http().patch(`/tasks/${a.id}`))
      .send({ milestoneId: null })
      .expect(200);
  });

  it("rejects another project's milestone", async () => {
    const other = await as(http().post('/projects'))
      .send({ name: 'Khác', key: 'KHAC' })
      .expect(201);
    const m = await as(
      http().post(`/projects/${(other.body as { id: string }).id}/milestones`),
    )
      .send({ name: 'Của dự án khác', date: '2026-10-30' })
      .expect(201);
    await as(http().post('/tasks'))
      .send({ projectId, title: 'Sai', milestoneId: (m.body as Milestone).id })
      .expect(404);
  });

  it('counts the stats row, overdue in the workspace timezone', async () => {
    const before = (
      await as(http().get(`/projects/${projectId}/stats`)).expect(200)
    ).body as Record<string, number>;
    await newTask('Trễ', { dueDate: '2020-01-01' });
    await newTask('Trễ nhưng xong', { dueDate: '2020-01-01', status: 'DONE' });
    await newTask('Đang xem', { status: 'REVIEW' });
    const after = (
      await as(http().get(`/projects/${projectId}/stats`)).expect(200)
    ).body as Record<string, number>;
    expect(after.taskCount - before.taskCount).toBe(3);
    expect(after.overdueCount - before.overdueCount).toBe(1);
    expect(after.reviewCount - before.reviewCount).toBe(1);
    expect(after.doneCount - before.doneCount).toBe(1);
  });

  it('pages the activity, with the task each entry is about', async () => {
    const t = await newTask('Ghi lại');
    const res = await as(
      http().get(`/projects/${projectId}/activity?limit=2`),
    ).expect(200);
    const page = res.body as {
      items: { action: string; task: { key: string } | null }[];
      hasMore: boolean;
    };
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.items[0]).toMatchObject({
      action: 'task.created',
      task: { key: t.key, title: 'Ghi lại' },
    });
  });

  it('keeps an archived project read-only', async () => {
    const m = (await milestones())[0];
    await as(http().post(`/projects/${projectId}/archive`)).expect(200);
    await as(http().patch(`/milestones/${m.id}`))
      .send({ name: 'Không được' })
      .expect(403);
    await as(http().post(`/projects/${projectId}/milestones`))
      .send({ name: 'Không được', date: '2026-10-30' })
      .expect(403);
    await as(http().get(`/projects/${projectId}/milestones`)).expect(200);
  });
});
