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
import { WsAdapter } from '@nestjs/platform-ws';
import { JwtService } from '@nestjs/jwt';

const suite = process.env.SECURITY_INTEGRATION === 'true' ? describe : describe.skip;
suite('Security: real HTTP, guards, services and isolated PostgreSQL', () => {
  let app: INestApplication;
  let db: PrismaService;
  const password = randomBytes(20).toString('hex') + 'A!1';
  const users: Record<string, any> = {};
  const cookies: Record<string, string[]> = {};
  const projects: Record<string, any> = {};
  const tasks: Record<string, any> = {};

  const post = (path: string, key?: string) => {
    const req = request(app.getHttpServer()).post(`/api/v1${path}`).set('X-Requested-With', 'FutureX').set('Origin', 'http://localhost:3000');
    return key ? req.set('Cookie', cookies[key]) : req;
  };
  const patch = (path: string, key?: string) => {
    const req = request(app.getHttpServer()).patch(`/api/v1${path}`).set('X-Requested-With', 'FutureX').set('Origin', 'http://localhost:3000');
    return key ? req.set('Cookie', cookies[key]) : req;
  };
  const del = (path: string, key?: string) => {
    const req = request(app.getHttpServer()).delete(`/api/v1${path}`).set('X-Requested-With', 'FutureX').set('Origin', 'http://localhost:3000');
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
  const ensureSession = async (key: string) => {
    const user = users[key];
    const session = await db.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 86400000),
        lastSeenAt: new Date(),
      },
    });
    const jwtService = app.get(JwtService);
    const token = jwtService.sign({ sub: user.id, sid: session.id, role: user.globalRole });
    cookies[key] = [`access_token=${token}`];
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
    app.useWebSocketAdapter(new WsAdapter(app));
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
    expect(responses.every((res) => [200, 201, 400, 409].includes(res.status))).toBe(true);
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
  it('does not leak teammate workload or email through the team listing', async () => {
    await db.team.create({ data: { name: 'Shared team', members: { create: [{ userId: users.a.id }, { userId: users.b.id }] } } });
    const res = await get('/teams', 'a');
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/assignedTasks|estimatedWorkloadHours|activeTasksCount|blockedTasksCount|capacityLevel/);
    expect(JSON.stringify(res.body)).not.toContain(users.b.email);
  });
  it('restricts global audit to Owner and scopes personal history/session metadata', async () => {
    expect((await get('/audit-logs', 'owner')).status).toBe(200);
    for (const key of ['a', 'b', 'admin']) expect((await get('/audit-logs', key)).status).toBe(403);
    const history = await get(`/audit-logs/my-login-history?actorId=${users.b.id}`, 'a');
    expect(history.status).toBe(200);
    const ownIds = (await db.auditLog.findMany({ where: { actorId: users.a.id } })).map((log) => log.id);
    expect(history.body.data.every((log: any) => ownIds.includes(log.id))).toBe(true);
    const sessions = await get(`/audit-logs/my-sessions?userId=${users.b.id}`, 'a');
    expect(sessions.status).toBe(200);
    const ownSessionIds = (await db.session.findMany({ where: { userId: users.a.id } })).map((session) => session.id);
    expect(sessions.body.data.every((session: any) => ownSessionIds.includes(session.id))).toBe(true);
    expect(JSON.stringify(sessions.body)).not.toMatch(/refreshTokenHash|passwordHash/);
    expect((await get('/audit-logs?limit=999999', 'owner')).status).toBe(400);
  });
  it('isolates notification reads and mark-read mutations', async () => {
    const notification = await db.notification.create({ data: { userId: users.b.id, type: 'TASK_ASSIGNED', title: 'B-private', message: 'private notification' } });
    expect(JSON.stringify((await get('/notifications', 'a')).body)).not.toContain(notification.id);
    await request(app.getHttpServer()).patch(`/api/v1/notifications/${notification.id}/read`).set('Cookie', cookies.a).set('X-Requested-With', 'FutureX');
    expect((await db.notification.findUniqueOrThrow({ where: { id: notification.id } })).isRead).toBe(false);
  });
  it('scopes calendar dates and rejects oversized/invalid ranges', async () => {
    await db.task.update({ where: { id: tasks.a.id }, data: { dueDate: new Date('2026-12-31T00:00:00Z') } });
    await db.task.update({ where: { id: tasks.b.id }, data: { dueDate: new Date('2026-12-31T00:00:00Z') } });
    const res = await get('/tasks?startDate=2026-12-01&endDate=2027-01-31', 'a');
    expect(res.status).toBe(200);
    expect(res.body.data.map((task: any) => task.id)).toContain(tasks.a.id);
    expect(JSON.stringify(res.body)).not.toContain(tasks.b.id);
    expect((await get('/tasks?startDate=2027-01-01&endDate=2027-01-31', 'a')).body.data).toEqual([]);
    for (const range of ['startDate=bad&endDate=2027-01-31', 'startDate=2020-01-01&endDate=2027-01-31', 'startDate=2027-02-01&endDate=2027-01-01']) {
      expect((await get(`/tasks?${range}`, 'a')).status).toBe(400);
    }
  });
  it('hides earlier employee updates and private attachments after reassignment', async () => {
    const task = await db.task.create({ data: { title: 'Reassigned', humanId: 'SECa-901', taskNumber: 901, projectId: projects.a.id, creatorId: users.admin.id, assigneeId: users.a.id } });
    const update = await db.taskDailyUpdate.create({ data: { taskId: task.id, projectId: projects.a.id, userId: users.b.id, progressBefore: 0, progressAfter: 10, completedToday: 'B-private-update', nextStep: 'private', workDate: new Date() } });
    const activity = await db.taskActivity.create({ data: { taskId: task.id, projectId: projects.a.id, userId: users.b.id, actionType: 'TASK_PROGRESS_UPDATED', description: 'B-private-activity' } });
    const file = await db.taskAttachment.create({ data: { projectId: projects.a.id, taskId: task.id, uploaderId: users.b.id, fileKey: 'previous-user.txt', fileName: 'Private', fileUrl: '/api/v1/files/download/previous-user.txt', fileSize: 1, mimeType: 'text/plain' } });
    const detail = await get(`/tasks/${task.id}`, 'a');
    expect(detail.status).toBe(200);
    for (const id of [update.id, activity.id, file.id]) expect(JSON.stringify(detail.body)).not.toContain(id);
    expect(JSON.stringify((await get(`/files/project/${projects.a.id}`, 'a')).body)).not.toContain(file.id);
    expect((await get('/files/download/previous-user.txt', 'a')).status).toBe(404);
  });
  it.each(['admin', 'owner'])('allows assigned %s execution but prevents self-review and impersonation', async (key) => {
    await db.projectMember.upsert({ where: { projectId_userId: { projectId: projects.a.id, userId: users[key].id } }, create: { projectId: projects.a.id, userId: users[key].id }, update: {} });
    const created = await post('/tasks', 'admin').send({ projectId: projects.a.id, title: `${key} assigned work`, assigneeId: users[key].id, allowParallelWork: true });
    expect(created.status).toBe(201);
    const taskId = created.body.data.id;
    const patch = (id: string, body: object) => request(app.getHttpServer()).patch(`/api/v1/tasks/${id}`).set('Cookie', cookies[key]).set('X-Requested-With', 'FutureX').send(body);
    expect((await patch(taskId, { status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await post(`/tasks/${taskId}/daily-updates`, key).send({ progress: 20, completedToday: 'Own work', nextStep: 'Continue' })).status).toBe(201);
    expect((await patch(tasks.a.id, { progress: 30 })).status).toBe(403);
    expect((await patch(tasks.a.id, { actualHours: 50 })).status).toBe(403);
    expect((await patch(taskId, { status: 'IN_REVIEW' })).status).toBe(200);
    expect((await post(`/tasks/${taskId}/review`, key).send({ status: 'APPROVED', completeTask: false })).status).toBe(403);
    expect((await post(`/tasks/${taskId}/review`, key === 'admin' ? 'owner' : 'admin').send({ status: 'APPROVED', completeTask: false })).status).toBeLessThan(300);
    expect((await db.task.findUniqueOrThrow({ where: { id: taskId } })).progress).toBe(20);
  });
  it('isolates Additional Work, rejects tampering/deletion, and preserves official progress', async () => {
    const before = await db.project.findUniqueOrThrow({ where: { id: projects.a.id } });
    const dto = { projectId: projects.a.id, title: 'Extra A work', description: 'Personal completed work', workDate: '2026-09-10', minutesSpent: 30 };
    const created = await post('/additional-work', 'a').send(dto);
    expect(created.status).toBe(201);
    const log = created.body.data;
    expect(log.creatorId).toBe(users.a.id); expect(log.countsTowardProductProgress).toBe(false);
    expect(log.source).toBe('MEMBER_ADDITIONAL_WORK');
    expect((await db.project.findUniqueOrThrow({ where: { id: projects.a.id } })).progress).toBe(before.progress);
    expect((await get(`/additional-work/${log.id}`, 'b')).status).toBe(404);
    expect(JSON.stringify((await get('/additional-work', 'b')).body)).not.toContain(log.id);
    expect((await post('/additional-work', 'a').send({ ...dto, projectId: projects.b.id })).status).toBe(404);
    for (const extra of [{ creatorId: users.b.id }, { performedById: users.b.id }, { assigneeId: users.b.id }, { countsTowardProductProgress: true }, { source: 'STANDARD_CHECKLIST' }, { status: 'APPROVED' }]) {
      expect((await post('/additional-work', 'a').send({ ...dto, ...extra })).status).toBe(400);
    }
    const { projectId, ...edit } = dto;
    const patch = (key: string, body: object) => request(app.getHttpServer()).patch(`/api/v1/additional-work/${log.id}`).set('Cookie', cookies[key]).set('X-Requested-With', 'FutureX').send(body);
    expect((await patch('b', edit)).status).toBe(404);
    expect((await patch('a', { ...edit, projectId: projects.b.id })).status).toBe(400);
    expect((await patch('a', { ...edit, title: 'Corrected title' })).status).toBe(200);
    expect((await request(app.getHttpServer()).delete(`/api/v1/additional-work/${log.id}`).set('Cookie', cookies.a).set('X-Requested-With', 'FutureX')).status).toBe(404);
    expect(await db.additionalWork.count({ where: { id: log.id } })).toBe(1);
    expect(await db.auditLog.count({ where: { actorId: users.a.id, entityId: log.id } })).toBe(2);
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
    expect((await post('/auth/change-password', 'b').send({ currentPassword: password, newPassword: randomBytes(20).toString('hex') + 'A!1' })).status).toBe(200);
    expect((await get('/auth/me', 'b')).status).toBe(401);
  });
  it('rejects cross-project planning references', async () => {
    const res = await request(app.getHttpServer()).patch(`/api/v1/tasks/${tasks.a.id}`).set('Cookie', cookies.admin)
      .set('X-Requested-With', 'FutureX').send({ assigneeId: users.b.id, parentTaskId: tasks.b.id });
    expect(res.status).toBe(400);
  });
  it('rejects active content uploads and mismatched signatures', async () => {
    for (const name of ['payload.html', 'image.png']) {
      const res = await post('/files/upload', 'a').field('projectId', projects.a.id).field('taskId', tasks.a.id)
        .attach('file', Buffer.from('<script>alert(1)</script>'), name);
      expect(res.status).toBe(400);
    }
  });
  it('applies secure authentication cookie settings', async () => {
    const previous = process.env.COOKIE_SECURE;
    process.env.COOKIE_SECURE = 'true';
    try {
      const res = await login('a');
      expect(([] as string[]).concat(res.headers['set-cookie']).every((value) => value.includes('; Secure') && value.includes('; HttpOnly'))).toBe(true);
    } finally { process.env.COOKIE_SECURE = previous; }
  });
  it('revokes existing sessions after a role change', async () => {
    const res = await request(app.getHttpServer()).patch(`/api/v1/users/${users.a.id}`).set('Cookie', cookies.owner)
      .set('X-Requested-With', 'FutureX').send({ globalRole: 'ADMIN' });
    expect(res.status).toBe(200);
    expect((await get('/auth/me', 'a')).status).toBe(401);
  });
  it('allows only Owner to delete projects', async () => {
    const call = (key: string) => request(app.getHttpServer()).delete(`/api/v1/projects/${projects.b.id}`)
      .set('Cookie', cookies[key]).set('X-Requested-With', 'FutureX');
    expect((await call('admin')).status).toBe(403);
    expect((await call('owner')).status).toBe(200);
    expect((await get(`/projects/${projects.b.id}`, 'owner')).status).toBe(404);
  });
  it('enforces project scope and role on milestone CRUD', async () => {
    await db.user.update({ where: { id: users.a.id }, data: { globalRole: 'TEAM_MEMBER' } });
    await ensureSession('a');
    await ensureSession('admin');

    const tmCreate = await post('/milestones', 'a').send({
      projectId: projects.a.id,
      name: 'Alpha Milestone',
      targetDate: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(tmCreate.status).toBe(403);

    const adminCreate = await post('/milestones', 'admin').send({
      projectId: projects.a.id,
      name: 'Alpha Milestone',
      targetDate: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(adminCreate.status).toBe(201);
    const milestoneId = adminCreate.body.data?.id || adminCreate.body.id;

    const tmUpdate = await patch(`/milestones/${milestoneId}`, 'a').send({ name: 'Hacked' });
    expect(tmUpdate.status).toBe(403);

    const tmDelete = await del(`/milestones/${milestoneId}`, 'a');
    expect(tmDelete.status).toBe(403);

    const fakeCreate = await post('/milestones', 'admin').send({
      projectId: '00000000-0000-0000-0000-000000000000',
      name: 'Ghost Milestone',
      targetDate: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(fakeCreate.status).toBe(404);

    const adminUpdate = await patch(`/milestones/${milestoneId}`, 'admin').send({ name: 'Updated Milestone' });
    expect(adminUpdate.status).toBe(200);

    const adminDelete = await del(`/milestones/${milestoneId}`, 'admin');
    expect(adminDelete.status).toBe(200);

    const deleteAudit = await db.auditLog.findFirst({
      where: { action: 'MILESTONE_DELETED', entityId: milestoneId },
    });
    expect(deleteAudit).toBeTruthy();
  });
  it('enforces project scope and role on dependency management', async () => {
    await ensureSession('a');
    await ensureSession('admin');

    const tmAdd = await post('/dependencies', 'a').send({
      predecessorTaskId: tasks.a.id,
      dependentTaskId: tasks.b.id,
    });
    expect(tmAdd.status).toBe(403);

    const crossAdd = await post('/dependencies', 'admin').send({
      predecessorTaskId: tasks.a.id,
      dependentTaskId: tasks.b.id,
    });
    expect(crossAdd.status).toBe(400);

    const taskA2 = await db.task.create({
      data: {
        projectId: projects.a.id,
        creatorId: users.admin.id,
        assigneeId: users.a.id,
        title: 'Task A Prerequisite',
        humanId: 'SEC-99',
        taskNumber: 102,
        status: 'READY',
      },
    });

    const adminAdd = await post('/dependencies', 'admin').send({
      predecessorTaskId: taskA2.id,
      dependentTaskId: tasks.a.id,
    });
    expect(adminAdd.status).toBe(201);
    const depId = adminAdd.body.data?.id || adminAdd.body.id;

    const tmRemove = await del(`/dependencies/${depId}`, 'a');
    expect(tmRemove.status).toBe(403);

    const adminRemove = await del(`/dependencies/${depId}`, 'admin');
    expect(adminRemove.status).toBe(200);

    const depAudit = await db.auditLog.findFirst({
      where: { action: 'DEPENDENCY_REMOVED', entityId: depId },
    });
    expect(depAudit).toBeTruthy();
  });
  it('soft-deletes comments, retains DB records, and logs audit entries', async () => {
    await ensureSession('a');

    const commentRes = await post('/comments', 'a').send({
      taskId: tasks.a.id,
      content: 'Important audit-sensitive comment',
    });
    expect(commentRes.status).toBe(201);
    const commentId = commentRes.body.data?.id || commentRes.body.id;

    const delRes = await del(`/comments/${commentId}`, 'a');
    expect(delRes.status).toBe(200);

    const commentInDb = await db.taskComment.findUnique({ where: { id: commentId } });
    expect(commentInDb).toBeTruthy();
    expect(commentInDb!.deletedAt).not.toBeNull();

    const secondDel = await del(`/comments/${commentId}`, 'a');
    expect(secondDel.status).toBe(404);

    const auditRecord = await db.auditLog.findFirst({
      where: { action: 'COMMENT_DELETED', entityId: commentId },
    });
    expect(auditRecord).toBeTruthy();
    expect(auditRecord!.actorId).toBe(users.a.id);
  });
  it('restricts development-template endpoint to Admin and Owner', async () => {
    await ensureSession('a');
    await ensureSession('admin');

    const tmRes = await get('/projects/development-template/items', 'a');
    expect(tmRes.status).toBe(403);

    const adminRes = await get('/projects/development-template/items', 'admin');
    expect(adminRes.status).toBe(200);
  });
  it('keeps dashboard audit and user security controls Owner-only', async () => {
    await ensureSession('owner');
    await ensureSession('admin');
    await ensureSession('b');

    expect((await get('/audit-logs/dashboard-summary', 'a')).status).toBe(403);
    expect((await get('/audit-logs/dashboard-summary', 'admin')).status).toBe(403);
    const summary = await get('/audit-logs/dashboard-summary', 'owner');
    expect(summary.status).toBe(200);
    expect(Array.isArray(summary.body.data?.recent ?? summary.body.recent)).toBe(true);

    expect((await get(`/users/${users.b.id}/security`, 'admin')).status).toBe(403);
    const security = await get(`/users/${users.b.id}/security`, 'owner');
    expect(security.status).toBe(200);
    expect(JSON.stringify(security.body)).not.toMatch(/passwordHash|refreshTokenHash|resetPasswordToken/);

    const activeSession = await db.session.findFirstOrThrow({ where: { userId: users.b.id, isRevoked: false } });
    const revoked = await patch(`/users/${users.b.id}/sessions/${activeSession.id}/revoke`, 'owner').send({});
    expect(revoked.status).toBe(200);
    expect((await db.session.findUniqueOrThrow({ where: { id: activeSession.id } })).isRevoked).toBe(true);
    const audit = await db.auditLog.findFirst({ where: { action: 'SESSION_REVOKED', entityId: activeSession.id } });
    expect(audit?.actorId).toBe(users.owner.id);
  });
  it('sets Content-Disposition: attachment on file downloads', async () => {
    await ensureSession('a');

    const upRes = await post('/files/upload', 'a')
      .field('projectId', projects.a.id)
      .field('taskId', tasks.a.id)
      .attach('file', Buffer.from('%PDF-1.4\n%test pdf content'), 'report.pdf');
    expect(upRes.status).toBe(201);
    const fileKey = upRes.body.data?.fileKey || upRes.body.fileKey;

    const dlRes = await get(`/files/download/${fileKey}`, 'a');
    expect(dlRes.status).toBe(200);
    expect(dlRes.headers['content-disposition']).toMatch(/^attachment;\s*filename="report\.pdf"/);
  });
  it('database trigger prevents mutation or deletion of AuditLog records', async () => {
    const testLog = await db.auditLog.create({
      data: {
        actorId: users.owner.id,
        action: 'TEST_IMMUTABILITY',
        entityType: 'System',
        detailsJson: JSON.stringify({ note: 'Immutable audit trial' }),
      },
    });

    await expect(
      db.$executeRawUnsafe(`UPDATE "AuditLog" SET action = 'MUTATED' WHERE id = '${testLog.id}'`),
    ).rejects.toThrow();

    await expect(
      db.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE id = '${testLog.id}'`),
    ).rejects.toThrow();
  });
  it('enforces password complexity validation on change-password', async () => {
    await ensureSession('b');

    const weakShort = await post('/auth/change-password', 'b').send({
      currentPassword: password,
      newPassword: 'Short1!',
    });
    expect(weakShort.status).toBe(400);

    const weakNoSpecial = await post('/auth/change-password', 'b').send({
      currentPassword: password,
      newPassword: 'Password12345678',
    });
    expect(weakNoSpecial.status).toBe(400);

    const weakNoUpper = await post('/auth/change-password', 'b').send({
      currentPassword: password,
      newPassword: 'password12345!@#',
    });
    expect(weakNoUpper.status).toBe(400);
  });
  it('error responses return sanitized request.path and do not leak route templates', async () => {
    const res = await get('/projects/non-existent-uuid', 'admin');
    expect(res.status).toBe(404);
    expect(res.body.path).toBe('/api/v1/projects/non-existent-uuid');
    expect(res.body.path).not.toContain(':id');
  });
});
