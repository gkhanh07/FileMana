import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ItemsService } from '../src/modules/items/items.service';
import { TrashService } from '../src/modules/trash/trash.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

type Entry = {
  type: string;
  id: string;
  name: string;
  location: string | null;
};
type Page = { items: Entry[]; hasMore: boolean };
type Result = {
  tasks: { id: string; key: string; project: string }[];
  projects: { id: string; name: string }[];
  items: { id: string; name: string; location: string }[];
  members: { id: string; name: string }[];
};

describe('Search and Trash (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let cookie: string;
  let filesDir: string;
  const http = () => request(app.getHttpServer());
  const get = async <T>(path: string) =>
    (await http().get(path).set('Cookie', cookie).expect(200)).body as T;
  const post = (path: string, body: object = {}) =>
    http().post(path).set('Cookie', cookie).send(body);
  const trash = () => get<Page>('/trash');
  const project = async (name: string, key: string) =>
    (
      (await post('/projects', { name, key }).expect(201)).body as {
        id: string;
      }
    ).id;
  const task = async (projectId: string, title: string) =>
    (await post('/tasks', { projectId, title }).expect(201)).body as {
      id: string;
      key: string;
    };
  const upload = async (taskId: string, name: string) =>
    (
      await http()
        .post(`/tasks/${taskId}/attachments`)
        .set('Cookie', cookie)
        .attach('file', Buffer.from('png'), name)
        .expect(201)
    ).body as { id: string };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    filesDir = app.get(ItemsService).filesDir;
    await prisma.user.create({
      data: {
        email: 'dung-tr@example.com',
        name: 'Đặng Dũng',
        passwordHash: await argon2.hash(PASSWORD),
      },
    });
    const res = await http()
      .post('/auth/login')
      .send({ email: 'dung-tr@example.com', password: PASSWORD })
      .expect(200);
    cookie = (res.headers['set-cookie'] as unknown as string[])[0];
  });

  afterAll(async () => {
    await app.close();
  });

  it('finds tasks, projects, files and people without diacritics', async () => {
    const pid = await project('Thiết kế Zebra', 'ZBR');
    const t = await task(pid, 'Vẽ logo Zebra');
    const gone = await task(pid, 'Zebra đã xóa');
    await http().delete(`/tasks/${gone.id}`).set('Cookie', cookie).expect(204);
    const file = await upload(t.id, 'Bản vẽ zebra.png');

    const r = await get<Result>('/search?q=zebra');
    expect(r.tasks).toEqual([
      expect.objectContaining({ id: t.id, project: 'Thiết kế Zebra' }),
    ]);
    expect(r.items).toEqual([
      expect.objectContaining({ id: file.id, location: 'Thiết kế Zebra' }),
    ]);
    expect((await get<Result>('/search?q=thiet ke zeb')).projects).toEqual([
      expect.objectContaining({ id: pid }),
    ]);
    expect(
      (await get<Result>(`/search?q=${t.key.toLowerCase()}`)).tasks[0].id,
    ).toBe(t.id);
    expect((await get<Result>('/search?q=dang dung')).members).toEqual([
      expect.objectContaining({ name: 'Đặng Dũng' }),
    ]);
    await http().get('/search?q=zebra').expect(401);
  });

  it('lists, restores and purges tasks, files and projects', async () => {
    const pid = await project('Thùng rác', 'TRR');
    const t = await task(pid, 'Việc bị xóa');
    const keep = await task(pid, 'Giữ tệp');
    const file = await upload(keep.id, 'xoa-han.png');
    await http().delete(`/tasks/${t.id}`).set('Cookie', cookie).expect(204);
    await http().delete(`/items/${file.id}`).set('Cookie', cookie).expect(204);

    let page = await trash();
    expect(page.items.slice(0, 2)).toEqual([
      expect.objectContaining({
        type: 'item',
        id: file.id,
        location: 'Thùng rác',
      }),
      expect.objectContaining({
        type: 'task',
        id: t.id,
        location: 'Thùng rác',
      }),
    ]);

    await post(`/trash/task/${t.id}/restore`).expect(204);
    expect((await trash()).items.some((e) => e.id === t.id)).toBe(false);
    await post(`/trash/task/${t.id}/restore`).expect(404);

    expect(existsSync(join(filesDir, file.id))).toBe(true);
    await http()
      .delete(`/trash/item/${file.id}`)
      .set('Cookie', cookie)
      .expect(204);
    expect(existsSync(join(filesDir, file.id))).toBe(false);
    expect(await prisma.item.count({ where: { id: file.id } })).toBe(0);

    await http()
      .delete(`/projects/${pid}`)
      .set('Cookie', cookie)
      .send({ name: 'Thùng rác' })
      .expect(204);
    page = await trash();
    expect(page.items[0]).toMatchObject({ type: 'project', id: pid });
    expect(page.items.some((e) => e.id === keep.id)).toBe(false);
    await post(`/trash/project/${pid}/restore`).expect(204);
    await get(`/projects/${pid}`);

    await http()
      .delete(`/projects/${pid}`)
      .set('Cookie', cookie)
      .send({ name: 'Thùng rác' })
      .expect(204);
    await http()
      .delete(`/trash/project/${pid}`)
      .set('Cookie', cookie)
      .expect(204);
    expect(await prisma.task.count({ where: { projectId: pid } })).toBe(0);
    await http()
      .delete(`/trash/project/${pid}`)
      .set('Cookie', cookie)
      .expect(404);
    await http()
      .delete(`/trash/folder/${pid}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('purges what was deleted more than 30 days ago', async () => {
    const pid = await project('Hết hạn', 'HH');
    const old = await task(pid, 'Cũ');
    const recent = await task(pid, 'Mới');
    const file = await upload(recent.id, 'cu.png');
    const longAgo = new Date(Date.now() - 31 * 86_400_000);
    await prisma.task.update({
      where: { id: old.id },
      data: { deletedAt: longAgo },
    });
    await prisma.item.update({
      where: { id: file.id },
      data: { deletedAt: longAgo },
    });
    await prisma.task.update({
      where: { id: recent.id },
      data: { deletedAt: new Date() },
    });

    await app.get(TrashService).purgeExpired();

    expect(await prisma.task.count({ where: { id: old.id } })).toBe(0);
    expect(await prisma.task.count({ where: { id: recent.id } })).toBe(1);
    expect(existsSync(join(filesDir, file.id))).toBe(false);
  });
});
