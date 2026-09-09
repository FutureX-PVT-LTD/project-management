import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { json } from 'express';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { csrfProtection, requestLimits } from './http-security';

const suite = process.env.SECURITY_INTEGRATION === 'true' ? describe : describe.skip;
suite('Security: real HTTP, guards, services and isolated PostgreSQL', () => {
  let app: INestApplication;
  let db: PrismaService;
  const password = randomBytes(20).toString('hex');
  const users: Record<string, any> = {};
  const cookies: Record<string, string[]> = {};
  const projects: Record<string, any> = {};
  const tasks: Record<string, any> = {};

  const post = (path: string, key?: string) => {
    const req = request(app.getHttpServer()).post(`/api/v1${path}`).set('X-Requested-With', 'FutureX').set('Origin', 'http://localhost:3000');
    return key ? req.set('Cookie', cookies[key]) : req;
  };
  const get = (path: string, key?: string) => {
    const req = request(app.getHttpServer()).get(`/api/v1${path}`);
    return key ? req.set('Cookie', cookies[key]) : req;
  };
  const login = async (key: string) => {
    const res = await post('/auth/login').send({ email: users[key].email, password });
    expect(res.status).toBe(200);
    cookies[key] = ([] as string[]).concat(res.headers['set-cookie']).map((v) => v.split(';')[0]);
    return res;
  };

  beforeAll(async () => {
    if (!new URL(process.env.DATABASE_URL!).searchParams.get('schema')?.startsWith('futurex_security_test_')) {
      throw new Error('An isolated test schema is required');
    }
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ bodyParser: false });
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.use(csrfProtection);
    app.use(json({ limit: '256kb' }));
    app.use(requestLimits());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    db = app.get(PrismaService);
    const passwordHash = await argon2.hash(password);
    for (const [key, role] of Object.entries({ a: 'TEAM_MEMBER', b: 'TEAM_MEMBER', admin: 'ADMIN', owner: 'OWNER' })) {
      users[key] = await db.user.create({ data: { email: `${key}@security.invalid`, firstName: key, lastName: 'Test', passwordHash, globalRole: role } });
      await login(key);
    }
    for (const key of ['a', 'b']) {
      projects[key] = await db.project.create({ data: {
        key: `SEC${key}`, name: `Confidential-${key}`, projectManagerId: users.admin.id,
        members: { create: { userId: users[key].id } },
      } });
      tasks[key] = await db.task.create({ data: {
        title: `Private-${key}`, humanId: `SEC${key}-101`, taskNumber: 101,
        projectId: projects[key].id, creatorId: users.admin.id, assigneeId: users[key].id,
        status: 'IN_PROGRESS', progress: 20,
      } });
    }
  }, 60000);
  afterAll(async () => { await app?.close(); });

  it.each(['/tasks', '/users', '/projects', '/reports/analytics', '/files/download/private.pdf'])('rejects unauthenticated %s', async (path) => {
    expect((await get(path)).status).toBe(401);
  });
  it('rejects invalid credentials and unknown users with the same message', async () => {
    const a = await post('/auth/login').send({ email: users.a.email, password: 'incorrect-password' });
    const b = await post('/auth/login').send({ email: 'unknown@security.invalid', password });
    expect(a.status).toBe(401); expect(b.status).toBe(401);
    expect(a.body.message).toEqual(b.body.message);
  });
  it('sets HttpOnly cookies and does not serialize bearer credentials', async () => {
    const res = await login('a');
    expect(([] as string[]).concat(res.headers['set-cookie']).every((value) => value.includes('HttpOnly') && value.includes('SameSite=Lax'))).toBe(true);
    expect(JSON.stringify(res.body).includes('accessToken')).toBe(false);
    expect(JSON.stringify(res.body).includes('refreshToken')).toBe(false);
  });
  it('blocks foreign tasks and unrelated projects while allowing the assigned task', async () => {
    expect((await get(`/tasks/${tasks.a.id}`, 'a')).status).toBe(200);
    expect((await get(`/tasks/${tasks.b.id}`, 'a')).status).toBe(404);
    expect([403, 404]).toContain((await get(`/projects/${projects.b.id}`, 'a')).status);
    expect((await get(`/files/project/${projects.b.id}`, 'a')).status).toBe(404);
    expect((await get(`/milestones/project/${projects.b.id}`, 'a')).status).toBe(404);
  });
  it('does not expose foreign tasks after sharing project membership', async () => {
    await db.projectMember.create({ data: { projectId: projects.b.id, userId: users.a.id } });
    expect((await get(`/tasks/${tasks.b.id}`, 'a')).status).toBe(404);
    const res = await get(`/projects/${projects.b.id}`, 'a');
    expect(res.status).toBe(200);
    expect(res.body.data.tasks.length).toBe(0);
    await db.projectMember.deleteMany({ where: { projectId: projects.b.id, userId: users.a.id } });
  });
  it('search and task listing do not leak unrelated names', async () => {
    const search = await get('/search?q=Confidential-b', 'a');
    expect(search.status).toBe(200);
    expect(JSON.stringify(search.body).includes(projects.b.id)).toBe(false);
    const res = await get(`/tasks?assigneeId=${users.b.id}`, 'a');
    expect(res.status).toBe(200); expect(res.body.data).toEqual([]);
  });
  it('blocks member management APIs and global reports', async () => {
    expect((await post('/projects', 'a').send({ name: 'Injected' })).status).toBe(403);
    expect((await post(`/tasks/${tasks.a.id}/review`, 'a').send({ status: 'APPROVED' })).status).toBe(403);
    expect((await get('/reports/analytics', 'a')).status).toBe(403);
    expect((await get(`/users/${users.b.id}`, 'a')).status).toBe(403);
  });
  it('blocks Admin resetting an Owner password or promoting themselves', async () => {
    expect((await post(`/users/${users.owner.id}/reset-password`, 'admin').send({ newPassword: password })).status).toBe(403);
    const res = await request(app.getHttpServer()).patch(`/api/v1/users/${users.admin.id}`).set('Cookie', cookies.admin)
      .set('X-Requested-With', 'FutureX').send({ globalRole: 'OWNER' });
    expect(res.status).toBe(403);
  });
  it('rejects foreign comments, attachments and spoofed employee updates', async () => {
    expect((await post('/comments', 'a').send({ taskId: tasks.b.id, content: 'Injected' })).status).toBe(404);
    const update = { progress: 30, completedToday: 'Work', nextStep: 'More work' };
    expect((await post(`/tasks/${tasks.a.id}/daily-updates`, 'admin').send(update)).status).toBe(403);
    expect((await post(`/tasks/${tasks.b.id}/daily-updates`, 'a').send(update)).status).toBe(404);
    expect((await post(`/tasks/${tasks.a.id}/daily-updates`, 'a').send({ ...update, userId: users.b.id })).status).toBe(400);
    expect((await post('/files/upload', 'a').field('projectId', projects.b.id).field('taskId', tasks.b.id)
      .attach('file', Buffer.from('private'), 'note.txt')).status).toBe(404);
  });
  it('requires ownership to download an attachment', async () => {
    await db.taskAttachment.create({ data: { projectId: projects.b.id, taskId: tasks.b.id, uploaderId: users.b.id,
      fileKey: 'secret.pdf', fileName: 'secret.pdf', fileUrl: '/api/v1/files/download/secret.pdf', fileSize: 5, mimeType: 'application/pdf' } });
    expect((await get('/files/download/secret.pdf', 'a')).status).toBe(404);
  });
  it('keeps partial progress on approval and accepts only one concurrent review', async () => {
    await db.task.update({ where: { id: tasks.a.id }, data: { status: 'IN_REVIEW', progress: 20 } });
    const responses = await Promise.all([1, 2].map(() => post(`/tasks/${tasks.a.id}/review`, 'admin').send({ status: 'APPROVED', completeTask: false })));
    expect(responses.filter((res) => res.status < 300)).toHaveLength(1);
    const task = await db.task.findUniqueOrThrow({ where: { id: tasks.a.id } });
    expect(task.progress).toBe(20); expect(task.status).toBe('IN_PROGRESS');
    expect(await db.taskReview.count({ where: { taskId: task.id } })).toBe(1);
  });
  it('rejects direct completion, planning edits and out-of-range progress', async () => {
    for (const body of [{ status: 'DONE' }, { assigneeId: users.b.id }, { progress: 150 }, { progress: 100 }]) {
      const res = await request(app.getHttpServer()).patch(`/api/v1/tasks/${tasks.a.id}`).set('Cookie', cookies.a)
        .set('X-Requested-With', 'FutureX').send(body);
      expect([400, 403]).toContain(res.status);
    }
  });
  it('rejects CSRF including multipart simple requests', async () => {
    expect((await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: users.a.email, password })).status).toBe(403);
    expect((await post('/auth/login').set('Origin', 'https://attacker.invalid').send({ email: users.a.email, password })).status).toBe(403);
  });
  it('does not expose password hashes in team or membership responses', async () => {
    const team = await db.team.create({ data: { name: 'Team', leadUserId: users.a.id, members: { create: { userId: users.a.id } } } });
    const res = await get(`/teams/${team.id}`, 'a');
    expect(res.status).toBe(200);
    expect(/passwordHash|resetPasswordToken|refreshTokenHash/.test(JSON.stringify(res.body))).toBe(false);
    const member = await post(`/projects/${projects.a.id}/members`, 'admin').send({ userId: users.a.id });
    expect(member.status).toBe(201);
    expect(/passwordHash|resetPasswordToken/.test(JSON.stringify(member.body))).toBe(false);
  });
  it('rotates refresh credentials, detects replay, and invalidates access on logout', async () => {
    await login('b');
    const oldCookies = [...cookies.b];
    const refreshed = await post('/auth/refresh', 'b').send({});
    expect(refreshed.status).toBe(200);
    cookies.b = ([] as string[]).concat(refreshed.headers['set-cookie']).map((v) => v.split(';')[0]);
    expect((await get('/auth/me', 'b')).status).toBe(200);
    expect((await post('/auth/refresh').set('Cookie', oldCookies).send({})).status).toBe(401);
    expect((await get('/auth/me', 'b')).status).toBe(401);
    await login('b');
    expect((await post('/auth/logout', 'b').send({})).status).toBe(200);
    expect((await get('/auth/me', 'b')).status).toBe(401);
    expect((await post('/auth/refresh', 'b').send({})).status).toBe(401);
  });
  it('rejects expired, idle, disabled and deleted sessions', async () => {
    for (const data of [{ expiresAt: new Date(0) }, { lastSeenAt: new Date(0) }]) {
      await login('b');
      await db.session.updateMany({ where: { userId: users.b.id }, data });
      expect((await get('/auth/me', 'b')).status).toBe(401);
    }
    await login('b');
    await db.user.update({ where: { id: users.b.id }, data: { isActive: false } });
    expect((await get('/auth/me', 'b')).status).toBe(401);
    await db.user.update({ where: { id: users.b.id }, data: { isActive: true, deletedAt: new Date() } });
    expect((await get('/auth/me', 'b')).status).toBe(401);
    await db.user.update({ where: { id: users.b.id }, data: { deletedAt: null } });
  });
  it('revokes all sessions on password change', async () => {
    await login('b');
    expect((await post('/auth/change-password', 'b').send({ currentPassword: password, newPassword: randomBytes(20).toString('hex') })).status).toBe(200);
    expect((await get('/auth/me', 'b')).status).toBe(401);
  });
});
