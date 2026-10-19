import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as argon2 from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { setupApp } from '../src/setup-app';

const PASSWORD = 'correct-horse-battery';

type Comment = {
  id: string;
  body: string;
  author: { id: string; name: string };
  mentions: { id: string; name: string }[];
  attachments: { id: string; name: string }[];
  editedAt: string | null;
};
type Page = { items: Comment[]; hasMore: boolean };

describe('Comments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let mai: string;
  let hung: string;
  let hungId: string;
  let taskId: string;
  let taskKey: string;
  let projectId: string;
  const http = () => request(app.getHttpServer());
  const login = async (email: string) => {
    const res = await http()
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return (res.headers['set-cookie'] as unknown as string[])[0];
  };
  const comments = async (query = '') =>
    (
      await http()
        .get(`/tasks/${taskId}/comments${query}`)
        .set('Cookie', mai)
        .expect(200)
    ).body as Page;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    const passwordHash = await argon2.hash(PASSWORD);
    await prisma.user.create({
      data: { email: 'mai-bl@example.com', name: 'Mai', passwordHash },
    });
    hungId = (
      await prisma.user.create({
        data: { email: 'hung-bl@example.com', name: 'Hùng', passwordHash },
      })
    ).id;
    mai = await login('mai-bl@example.com');
    hung = await login('hung-bl@example.com');
    projectId = (
      (
        await http()
          .post('/projects')
          .set('Cookie', mai)
          .send({ name: 'Bình luận', key: 'BL' })
          .expect(201)
      ).body as { id: string }
    ).id;
    ({ id: taskId, key: taskKey } = (
      await http()
        .post('/tasks')
        .set('Cookie', mai)
        .send({ projectId, title: 'Sửa banner' })
        .expect(201)
    ).body as { id: string; key: string });
  });

  afterAll(async () => {
    await app.close();
  });

  it('posts with a mention and a file, counts it and logs it', async () => {
    const file = (
      await http()
        .post(`/tasks/${taskId}/attachments`)
        .set('Cookie', mai)
        .attach('file', Buffer.from('png'), 'banner.png')
        .expect(201)
    ).body as { id: string };
    const c = (
      await http()
        .post(`/tasks/${taskId}/comments`)
        .set('Cookie', mai)
        .send({
          body: '  @Hùng xem giúp  ',
          mentionIds: [hungId],
          attachmentIds: [file.id],
        })
        .expect(201)
    ).body as Comment;
    expect(c).toMatchObject({
      body: '@Hùng xem giúp',
      author: { name: 'Mai' },
      mentions: [{ id: hungId, name: 'Hùng' }],
      attachments: [{ id: file.id, name: 'banner.png' }],
      editedAt: null,
    });

    const task = (
      await http().get(`/tasks/${taskKey}`).set('Cookie', mai).expect(200)
    ).body as { commentCount: number; project: { memberIds: string[] } };
    expect(task.commentCount).toBe(1);
    expect(task.project.memberIds).toHaveLength(1);
    const activity = (
      await http()
        .get(`/tasks/${taskId}/activity`)
        .set('Cookie', mai)
        .expect(200)
    ).body as { items: { action: string }[] };
    expect(activity.items[0].action).toBe('task.commented');

    await http()
      .post(`/tasks/${taskId}/comments`)
      .set('Cookie', hung)
      .send({ body: '', attachmentIds: [file.id] })
      .expect(400)
      .expect((r) => expect(r.body).toMatchObject({ code: 'COMMENT_EMPTY' }));
  });

  it('pages newest first', async () => {
    for (const body of ['một', 'hai'])
      await http()
        .post(`/tasks/${taskId}/comments`)
        .set('Cookie', hung)
        .send({ body })
        .expect(201);
    const first = await comments('?limit=2');
    expect(first.items.map((c) => c.body)).toEqual(['hai', 'một']);
    expect(first.hasMore).toBe(true);
    const rest = await comments('?offset=2&limit=2');
    expect(rest.items.map((c) => c.body)).toEqual(['@Hùng xem giúp']);
    expect(rest.hasMore).toBe(false);
  });

  it('lets only the author edit or delete, with undo', async () => {
    const [mine] = (await comments()).items.filter((c) => c.body === 'hai');
    for (const req of [
      () => http().patch(`/comments/${mine.id}`).send({ body: 'sửa' }),
      () => http().delete(`/comments/${mine.id}`),
    ])
      await req()
        .set('Cookie', mai)
        .expect(403)
        .expect((r) =>
          expect(r.body).toMatchObject({ code: 'NOT_COMMENT_AUTHOR' }),
        );

    const edited = (
      await http()
        .patch(`/comments/${mine.id}`)
        .set('Cookie', hung)
        .send({ body: 'hai (sửa)' })
        .expect(200)
    ).body as Comment;
    expect(edited.body).toBe('hai (sửa)');
    expect(edited.editedAt).not.toBeNull();

    await http().delete(`/comments/${mine.id}`).set('Cookie', hung).expect(204);
    expect((await comments()).items).toHaveLength(2);
    await http()
      .patch(`/comments/${mine.id}`)
      .set('Cookie', hung)
      .send({ body: 'x' })
      .expect(404);
    await http()
      .post(`/comments/${mine.id}/restore`)
      .set('Cookie', hung)
      .expect(200);
    expect((await comments()).items).toHaveLength(3);
  });

  it('is read-only in an archived project', async () => {
    await http()
      .post(`/projects/${projectId}/archive`)
      .set('Cookie', mai)
      .expect(200);
    await http()
      .post(`/tasks/${taskId}/comments`)
      .set('Cookie', mai)
      .send({ body: 'muộn' })
      .expect(403)
      .expect((r) =>
        expect(r.body).toMatchObject({ code: 'PROJECT_ARCHIVED' }),
      );
    expect((await comments()).items).toHaveLength(3);
  });
});
