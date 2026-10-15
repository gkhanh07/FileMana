import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { readdirSync } from 'node:fs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ItemsService } from '../src/modules/items/items.service';
import { MAX_FILE_BYTES } from '../src/modules/items/upload';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';
const HOUR = 60 * 60 * 1000;

type Person = { id: string; name: string };
type Item = {
  id: string;
  kind: 'FOLDER' | 'FILE';
  name: string;
  creator: Person | null;
  size: number | null;
  childCount: number;
  locked: boolean;
  url: string | null;
};
type Root = Item & {
  project: { id: string; key: string; name: string; archived: boolean } | null;
};
type Detail = Root & {
  path: { id: string; name: string }[];
  readOnly: boolean;
  tasks: { id: string; key: string; title: string; status: string }[];
  mimeType: string | null;
};
type Page = { items: Item[]; hasMore: boolean };
type Task = { id: string; key: string; attachmentCount: number };

// FR-FILE-01..08/12..14, FR-TASK-08/18, FR-UI-07, NFR-05, FR-ACT-01
describe('Docs & Files (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let filesDir: string;
  let webOrigin: string;
  let khoa: Person;
  let cookie: string;
  let general: Root;
  let projectId: string;
  let projectRoot: string;
  const http = () => request(app.getHttpServer());
  const get = (path: string, as = cookie) => http().get(path).set('Cookie', as);
  const create = (body: object) =>
    http().post('/items').set('Cookie', cookie).send(body);
  const patch = (id: string, body: object, as = cookie) =>
    http().patch(`/items/${id}`).set('Cookie', as).send(body);
  const del = (id: string) =>
    http().delete(`/items/${id}`).set('Cookie', cookie);
  const restore = (id: string) =>
    http().post(`/items/${id}/restore`).set('Cookie', cookie);
  const upload = (
    parentId: string | undefined,
    name: string,
    content: string | Buffer = 'xin chào',
  ) =>
    http()
      .post(`/items/files${parentId ? `?parentId=${parentId}` : ''}`)
      .set('Cookie', cookie)
      .attach('file', Buffer.from(content), name);
  const attach = (taskId: string, name = 'logo.png') =>
    http()
      .post(`/tasks/${taskId}/attachments`)
      .set('Cookie', cookie)
      .attach('file', Buffer.from('png'), name);
  const folder = async (name: string, parentId?: string) =>
    (await create({ name, parentId }).expect(201)).body as Item;
  const file = async (name: string, parentId?: string, content?: string) =>
    (await upload(parentId, name, content).expect(201)).body as Item;
  const detail = async (id: string) =>
    (await get(`/items/${id}`).expect(200)).body as Detail;
  const children = async (id: string, query = '') =>
    (await get(`/items/${id}/children${query}`).expect(200)).body as Page;
  const names = (page: Page) => page.items.map((i) => i.name);
  // The response body as bytes, whatever its type.
  const raw = (url: string) => get(url).responseType('blob');
  const stored = () => readdirSync(filesDir).length;
  const newProject = async (name: string, key: string) => {
    const res = await http()
      .post('/projects')
      .set('Cookie', cookie)
      .send({ name, key })
      .expect(201);
    const id = (res.body as { id: string }).id;
    const root = (await get(`/projects/${id}/folder`).expect(200))
      .body as Detail;
    return { id, root: root.id };
  };
  const newTask = async (title: string, inProject = projectId) =>
    (
      await http()
        .post('/tasks')
        .set('Cookie', cookie)
        .send({ projectId: inProject, title })
        .expect(201)
    ).body as Task;
  const projectTasks = async () =>
    (await get(`/projects/${projectId}/tasks`).expect(200)).body as Task[];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    filesDir = app.get(ItemsService).filesDir;
    webOrigin = app.get(ConfigService).getOrThrow<string>('WEB_ORIGIN');
    const passwordHash = await argon2.hash(PASSWORD);
    khoa = await prisma.user.create({
      data: { email: 'khoa@example.com', name: 'Khoa', passwordHash },
    });
    const res = await http()
      .post('/auth/login')
      .send({ email: 'khoa@example.com', password: PASSWORD })
      .expect(200);
    cookie = (res.headers['set-cookie'] as unknown as string[])[0];
    ({ id: projectId, root: projectRoot } = await newProject(
      'Tài liệu thiết kế',
      'TLTK',
    ));
    general = ((await get('/items/roots').expect(200)).body as Root[])[0];
  });

  afterAll(async () => {
    await app.close();
  });

  // FR-FILE-01: the Docs & Files page is the General root, opened without its id.
  it('opens the Docs & Files page as the General root', async () => {
    expect(await get('/items/library').expect(200)).toMatchObject({
      body: {
        id: general.id,
        kind: 'FOLDER',
        name: 'Tài liệu & tệp',
        path: [],
        project: null,
        locked: true,
        readOnly: false,
      },
    });
    await http().get('/items/library').expect(401);
  });

  it('lists General first, then a locked folder per project', async () => {
    const roots = (await get('/items/roots').expect(200)).body as Root[];
    expect(roots[0]).toMatchObject({
      kind: 'FOLDER',
      name: 'Tài liệu & tệp',
      project: null,
      creator: null,
      locked: true,
    });
    expect(roots).toContainEqual(
      expect.objectContaining({
        id: projectRoot,
        name: 'Tài liệu thiết kế',
        locked: true,
        project: expect.objectContaining({
          id: projectId,
          key: 'TLTK',
          archived: false,
        }) as unknown,
      }),
    );
    expect(await detail(projectRoot)).toMatchObject({
      path: [],
      readOnly: false,
      tasks: [],
      project: { id: projectId },
    });
    await http().get('/items/roots').expect(401);
    await get(`/projects/${randomUUID()}/folder`).expect(404);
  });

  it('creates, nests, renames and moves folders; the roots stay put', async () => {
    const design = await folder(' Thiết kế\u0007 ', projectRoot);
    expect(design).toMatchObject({
      kind: 'FOLDER',
      name: 'Thiết kế',
      creator: { id: khoa.id, name: 'Khoa' },
      childCount: 0,
      locked: false,
      size: null,
      url: null,
    });
    const logo = await folder('Logo', design.id);
    const drafts = await folder('Bản nháp', logo.id);
    expect((await detail(drafts.id)).path).toEqual([
      { id: projectRoot, name: 'Tài liệu thiết kế' },
      { id: design.id, name: 'Thiết kế' },
      { id: logo.id, name: 'Logo' },
    ]);
    expect((await detail(design.id)).childCount).toBe(1);

    for (const name of [undefined, '   ']) {
      const res = await create({ name, parentId: design.id });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ code: 'NAME_REQUIRED' });
    }
    // Only folders are created here; files are uploaded.
    await create({ kind: 'FILE', name: 'Tệp' }).expect(400);
    await create({ name: 'X', parentId: 'abc' }).expect(400);
    const nowhere = await create({ name: 'X', parentId: randomUUID() }).expect(
      404,
    );
    expect(nowhere.body).toMatchObject({ code: 'ITEM_NOT_FOUND' });

    expect(
      (await patch(logo.id, { name: 'Logo 2026' }).expect(200)).body,
    ).toMatchObject({ name: 'Logo 2026' });
    expect((await patch(logo.id, { name: '' }).expect(400)).body).toMatchObject(
      { code: 'NAME_REQUIRED' },
    );

    // FR-FILE-07
    for (const root of [general.id, projectRoot]) {
      for (const res of [
        await patch(root, { name: 'Khác' }),
        await patch(root, { parentId: design.id }),
        await del(root),
      ]) {
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ code: 'ITEM_LOCKED' });
      }
    }

    for (const into of [design.id, drafts.id]) {
      const res = await patch(design.id, { parentId: into }).expect(400);
      expect(res.body).toMatchObject({ code: 'INVALID_MOVE' });
    }
    const moved = (await patch(drafts.id, { parentId: general.id }).expect(200))
      .body as Detail;
    expect(moved).toMatchObject({
      path: [{ id: general.id, name: 'Tài liệu & tệp' }],
      project: null,
    });
    expect((await detail(logo.id)).childCount).toBe(0);
    await patch(drafts.id, { parentId: randomUUID() }).expect(404);
    await patch(drafts.id, { parentId: 'abc' }).expect(400);

    await get('/items/abc').expect(404);
    await get(`/items/${randomUUID()}`).expect(404);
  });

  it('uploads files with their Vietnamese names', async () => {
    const before = stored();
    const content = '%PDF-1.4 kế hoạch';
    const plan = await file('Kế hoạch dự án.pdf', projectRoot, content);
    expect(plan).toMatchObject({
      kind: 'FILE',
      name: 'Kế hoạch dự án.pdf',
      size: Buffer.byteLength(content),
      creator: { id: khoa.id },
      locked: false,
    });
    expect(plan.url).toMatch(
      new RegExp(`^/items/${plan.id}/raw\\?exp=\\d+&sig=[\\w-]+$`),
    );
    expect(readdirSync(filesDir)).toContain(plan.id);
    expect(await detail(plan.id)).toMatchObject({
      mimeType: 'application/pdf',
      path: [{ id: projectRoot }],
      project: { id: projectId },
    });
    // Left out: General.
    const notes = await file('ghi-chú.txt');
    expect((await detail(notes.id)).path).toEqual([
      { id: general.id, name: 'Tài liệu & tệp' },
    ]);
    expect(stored()).toBe(before + 2);

    const log = await prisma.activity.findMany({
      where: { targetId: plan.id },
    });
    expect(log).toMatchObject([
      {
        action: 'file.uploaded',
        actorId: khoa.id,
        projectId,
        targetType: 'item',
        newValue: { name: 'Kế hoạch dự án.pdf' },
      },
    ]);
  });

  it('keeps nothing on disk when an upload fails', async () => {
    const before = stored();
    const nowhere = await upload(randomUUID(), 'a.txt').expect(404);
    expect(nowhere.body).toMatchObject({ code: 'ITEM_NOT_FOUND' });
    await upload('abc', 'a.txt').expect(400);
    await http()
      .post('/items/files')
      .set('Cookie', cookie)
      .attach('tep', Buffer.from('x'), 'a.txt')
      .expect(400);
    const none = await http()
      .post('/items/files')
      .set('Cookie', cookie)
      .expect(400);
    expect(none.body).toMatchObject({ code: 'FILE_REQUIRED' });
    await http()
      .post('/items/files')
      .attach('file', Buffer.from('x'), 'a.txt')
      .expect(401);
    expect(stored()).toBe(before);
  });

  it('refuses files over 100 MB', async () => {
    const before = stored();
    const res = await upload(
      projectRoot,
      'quay-man-hinh.mp4',
      Buffer.alloc(MAX_FILE_BYTES + 1),
    ).expect(413);
    expect(res.body).toMatchObject({ code: 'FILE_TOO_LARGE' });
    expect(stored()).toBe(before);
  }, 60_000);

  it('serves files inline or as a download, only through a valid link', async () => {
    const plan = await file('Kế hoạch dự án.pdf', projectRoot, '%PDF-1.4');
    const url = plan.url!;
    const res = await raw(url).expect(200);
    expect(res.body).toEqual(Buffer.from('%PDF-1.4'));
    expect(res.headers).toMatchObject({
      'content-type': 'application/pdf',
      'content-security-policy': `frame-ancestors ${webOrigin}`,
      'cross-origin-resource-policy': 'same-site',
      'cache-control': 'private, max-age=3600',
    });
    expect(res.headers['content-disposition']).toMatch(/^inline;/);
    expect(res.headers['content-disposition']).toContain(
      "filename*=UTF-8''K%E1%BA%BF%20ho%E1%BA%A1ch%20d%E1%BB%B1%20%C3%A1n.pdf",
    );
    expect(res.headers['x-frame-options']).toBeUndefined();

    const download = await raw(`${url}&dl=1`).expect(200);
    expect(download.headers['content-disposition']).toMatch(/^attachment;/);
    expect(download.headers['content-type']).toBe('application/octet-stream');
    expect(download.headers['x-frame-options']).toBe('SAMEORIGIN');

    // Pages that could run scripts on the API's origin always download.
    for (const name of ['trang.html', 'logo.svg', 'ghi-chu.txt']) {
      const f = await file(name, projectRoot, '<script>alert(1)</script>');
      const page = await raw(f.url!).expect(200);
      expect(page.headers['content-disposition']).toMatch(/^attachment;/);
      expect(page.headers['content-type']).toBe('application/octet-stream');
      expect(page.headers['x-content-type-options']).toBe('nosniff');
      expect(page.body).toEqual(Buffer.from('<script>alert(1)</script>'));
    }

    // Video seeking and the start of a long text file.
    const part = await raw(url).set('Range', 'bytes=0-3').expect(206);
    expect(part.body).toEqual(Buffer.from('%PDF'));

    // NFR-05
    await http().get(url).expect(401);
    const [path, query] = url.split('?');
    const params = new URLSearchParams(query);
    const sig = params.get('sig')!;
    params.set('sig', (sig[0] === 'A' ? 'B' : 'A') + sig.slice(1));
    const forged = await get(`${path}?${params.toString()}`).expect(403);
    expect(forged.body).toMatchObject({ code: 'LINK_EXPIRED' });
    await get(path).expect(400);
    // Another file's link doesn't open this one.
    const other = await file('khac.pdf', projectRoot, '%PDF-khac');
    await get(`${path}?${other.url!.split('?')[1]}`).expect(403);

    const clock = jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.now() + 3 * HOUR);
    try {
      const expired = await get(url).expect(403);
      expect(expired.body).toMatchObject({ code: 'LINK_EXPIRED' });
    } finally {
      clock.mockRestore();
    }

    await del(plan.id).expect(204);
    await get(url).expect(404);
  });

  it('lists folders, then files, with filters, search and pages', async () => {
    const box = await folder('Hồ sơ', projectRoot);
    await file('bảng giá.xlsx', box.id);
    await file('Zalo_100%.txt', box.id);
    await file('Ảnh bìa.png', box.id);
    await file('Zalo_100x.txt', box.id);
    await folder('Bản vẽ', box.id);
    await folder('Ảnh', box.id);

    const all = await children(box.id);
    expect(names(all)).toEqual([
      'Ảnh',
      'Bản vẽ',
      'Ảnh bìa.png',
      'bảng giá.xlsx',
      'Zalo_100%.txt',
      'Zalo_100x.txt',
    ]);
    expect(all.hasMore).toBe(false);
    expect(names(await children(box.id, '?type=all'))).toEqual(names(all));
    await get(`/items/${box.id}/children?type=docs`).expect(400);
    expect(names(await children(box.id, '?type=files'))).toEqual([
      'Ảnh bìa.png',
      'bảng giá.xlsx',
      'Zalo_100%.txt',
      'Zalo_100x.txt',
    ]);
    await get(`/items/${box.id}/children?type=folders`).expect(400);

    const search = async (q: string, type = 'all') =>
      names(await children(box.id, `?q=${encodeURIComponent(q)}&type=${type}`));
    expect(await search('bảng')).toEqual(['bảng giá.xlsx']);
    expect(await search('BẢNG')).toEqual(['bảng giá.xlsx']);
    expect(await search('ản', 'files')).toEqual([
      'Ảnh bìa.png',
      'bảng giá.xlsx',
    ]);
    // Wildcards are plain characters.
    expect(await search('100%')).toEqual(['Zalo_100%.txt']);
    expect(await search('a_o')).toEqual([]);
    expect(await search('  ')).toEqual(names(all));

    const first = await children(box.id, '?limit=3');
    expect(first).toMatchObject({ hasMore: true });
    expect(names(first)).toEqual(['Ảnh', 'Bản vẽ', 'Ảnh bìa.png']);
    const last = await children(box.id, '?limit=3&offset=4');
    expect(last).toMatchObject({ hasMore: false });
    expect(names(last)).toEqual(['Zalo_100%.txt', 'Zalo_100x.txt']);
    for (const bad of ['limit=0', 'limit=101', 'offset=-1', 'limit=x']) {
      await get(`/items/${box.id}/children?${bad}`).expect(400);
    }

    const f = (await children(box.id, '?type=files')).items[0];
    await get(`/items/${f.id}/children`).expect(404);
  });

  it('deletes to Trash with the contents, and Undo brings them back', async () => {
    const box = await folder('Lưu tạm', projectRoot);
    const inner = await folder('Bên trong', box.id);
    const kept = await file('giu-lai.txt', inner.id);
    const gone = await file('xoa-truoc.txt', inner.id);
    await del(gone.id).expect(204);
    await del(gone.id).expect(404);
    await del(box.id).expect(204);

    for (const id of [box.id, inner.id, kept.id]) {
      await get(`/items/${id}`).expect(404);
    }
    await get(kept.url!).expect(404);
    await get(`/items/${inner.id}/children`).expect(404);
    expect((await children(projectRoot)).items.map((i) => i.id)).not.toContain(
      box.id,
    );
    const before = stored();
    await upload(inner.id, 'moi.txt').expect(404);
    expect(stored()).toBe(before);
    await create({ name: 'Mới', parentId: inner.id }).expect(404);

    // Not while the folder it was in is still in Trash.
    await restore(gone.id).expect(404);
    const back = await restore(box.id).expect(200);
    expect(back.body).toMatchObject({ id: box.id, childCount: 1 });
    expect((await detail(inner.id)).childCount).toBe(1);
    await restore(gone.id).expect(200);
    expect(names(await children(inner.id))).toEqual([
      'giu-lai.txt',
      'xoa-truoc.txt',
    ]);
    await restore(box.id).expect(404);
    await restore(randomUUID()).expect(404);
  });

  it('attaches files to tasks and keeps them in the project folder', async () => {
    const task = await newTask('Thiết kế logo');
    const before = stored();
    const logo = (await attach(task.id, 'logo-v1.png').expect(201))
      .body as Item;
    expect(logo).toMatchObject({ kind: 'FILE', name: 'logo-v1.png' });
    expect(stored()).toBe(before + 1);
    expect(
      (await get(`/tasks/${task.id}/attachments`).expect(200)).body,
    ).toMatchObject([{ id: logo.id }]);
    expect((await projectTasks()).find((t) => t.id === task.id)).toMatchObject({
      attachmentCount: 1,
    });
    expect((await children(projectRoot)).items.map((i) => i.id)).toContain(
      logo.id,
    );
    expect((await detail(logo.id)).tasks).toEqual([
      { id: task.id, key: task.key, title: 'Thiết kế logo', status: 'TODO' },
    ]);
    const log = await get(`/tasks/${task.id}/activity`).expect(200);
    expect(log.body).toMatchObject({
      items: expect.arrayContaining([
        expect.objectContaining({
          action: 'task.attachment',
          actor: expect.objectContaining({ id: khoa.id }) as unknown,
          newValue: { id: logo.id, name: 'logo-v1.png' },
        }),
      ]) as unknown,
    });

    await del(logo.id).expect(204);
    expect((await get(`/tasks/${task.id}/attachments`)).body).toEqual([]);
    expect((await projectTasks()).find((t) => t.id === task.id)).toMatchObject({
      attachmentCount: 0,
    });

    // A file moved into a folder that then goes to Trash leaves the task too.
    const second = (await attach(task.id, 'logo-v2.png').expect(201))
      .body as Item;
    const old = await folder('Bản cũ', projectRoot);
    await patch(second.id, { parentId: old.id }).expect(200);
    expect((await get(`/tasks/${task.id}/attachments`)).body).toMatchObject([
      { id: second.id },
    ]);
    await del(old.id).expect(204);
    expect((await get(`/tasks/${task.id}/attachments`)).body).toEqual([]);

    const third = (await attach(task.id, 'logo-v3.png').expect(201))
      .body as Item;
    const count = stored();
    const unknown = await attach(randomUUID()).expect(404);
    expect(unknown.body).toMatchObject({ code: 'TASK_NOT_FOUND' });
    await attach('abc').expect(404);
    const none = await http()
      .post(`/tasks/${task.id}/attachments`)
      .set('Cookie', cookie)
      .expect(400);
    expect(none.body).toMatchObject({ code: 'FILE_REQUIRED' });
    await http().delete(`/tasks/${task.id}`).set('Cookie', cookie).expect(204);
    await attach(task.id).expect(404);
    await get(`/tasks/${task.id}/attachments`).expect(404);
    expect(stored()).toBe(count);
    // The file stays in the folder; it just isn't on a task any more.
    expect((await detail(third.id)).tasks).toEqual([]);
  });

  it('keeps archived projects read-only', async () => {
    const { id, root } = await newProject('Lưu trữ cũ', 'LTCU');
    const contracts = await folder('Hợp đồng', root);
    const signed = await file('hop-dong.pdf', root, '%PDF-ky');
    const binned = await file('ban-nhap.txt', root);
    await del(binned.id).expect(204);
    const task = await newTask('Ký hợp đồng', id);
    const outside = await folder('Ngoài', projectRoot);
    await http()
      .post(`/projects/${id}/archive`)
      .set('Cookie', cookie)
      .expect(200);

    const before = stored();
    for (const res of [
      await create({ name: 'Mới', parentId: root }),
      await create({ name: 'Mới', parentId: contracts.id }),
      await upload(root, 'moi.txt'),
      await patch(contracts.id, { name: 'Đổi tên' }),
      await patch(contracts.id, { parentId: projectRoot }),
      await patch(outside.id, { parentId: contracts.id }),
      await del(signed.id),
      await restore(binned.id),
      await attach(task.id),
    ]) {
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ code: 'PROJECT_ARCHIVED' });
    }
    expect(stored()).toBe(before);

    expect(await detail(contracts.id)).toMatchObject({
      readOnly: true,
      project: { id, archived: true },
    });
    expect((await get('/items/roots')).body).toContainEqual(
      expect.objectContaining({
        id: root,
        project: expect.objectContaining({ archived: true }) as unknown,
      }),
    );
    expect(names(await children(root))).toEqual(['Hợp đồng', 'hop-dong.pdf']);
    await raw(signed.url!).expect(200);

    await http()
      .post(`/projects/${id}/restore`)
      .set('Cookie', cookie)
      .expect(200);
    await patch(contracts.id, { name: 'Hợp đồng 2026' }).expect(200);
  });

  it('hides the folder of a project in Trash', async () => {
    const { id, root } = await newProject('Dự án tạm', 'XOA');
    const note = await file('tam.txt', root);
    // The folder follows the project's name.
    await http()
      .patch(`/projects/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'Dự án tạm 2' })
      .expect(200);
    expect((await detail(root)).name).toBe('Dự án tạm 2');
    await http()
      .delete(`/projects/${id}`)
      .set('Cookie', cookie)
      .send({ name: 'Dự án tạm 2' })
      .expect(204);

    const roots = (await get('/items/roots')).body as Root[];
    expect(roots.map((r) => r.id)).not.toContain(root);
    for (const path of [
      `/items/${root}`,
      `/items/${root}/children`,
      `/items/${note.id}`,
      note.url!,
    ]) {
      await get(path).expect(404);
    }
    const folderGone = await get(`/projects/${id}/folder`).expect(404);
    expect(folderGone.body).toMatchObject({ code: 'PROJECT_NOT_FOUND' });
    await upload(root, 'moi.txt').expect(404);
    const loose = await folder('Lạc', projectRoot);
    await patch(loose.id, { parentId: root }).expect(404);
  });
});
