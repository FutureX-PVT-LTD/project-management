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
  it('keeps draft Products private and inert until an authorized activation', async () => {
    const created = await post('/projects/drafts', 'admin').send({
      name: 'Security Draft Product',
      productType: 'APP',
      currentStep: 'TEAM',
      selectedMemberIds: [],
      developmentEnabled: true,
      marketingEnabled: false,
    });
    expect(created.status).toBe(201);
    const draftId = created.body.data.id;

    expect((await get('/projects/drafts', 'a')).status).toBe(403);
    expect(JSON.stringify((await get('/projects', 'admin')).body)).not.toContain(draftId);
    expect(JSON.stringify((await get('/search?q=Security%20Draft', 'admin')).body)).not.toContain(draftId);
    expect(JSON.stringify((await get('/projects/drafts', 'owner')).body)).toContain(draftId);
    expect(await db.task.count({ where: { projectId: draftId } })).toBe(0);
    expect(await db.projectWorkstream.count({ where: { projectId: draftId } })).toBe(0);

    const saved = await patch(`/projects/drafts/${draftId}`, 'admin').send({
      description: 'Autosaved details',
      currentStep: 'REVIEW',
    });
    expect(saved.status).toBe(200);
    expect(saved.body.data.currentStep).toBe('REVIEW');

    await db.checklistTemplateItem.create({
      data: {
        code: 'PD-DRAFT-SEC',
        workstream: 'DEVELOPMENT',
        phase: '1. Concept',
        title: 'Draft activation smoke item',
        ownerRole: 'PROJECT MANAGEMENT',
        defaultOrder: 999,
        applicableTypes: ['APP'],
        templateVersion: 'security-test',
      },
    });

    const activated = await post(`/projects/drafts/${draftId}/activate`, 'admin').send({});
    expect(activated.status).toBe(201);
    const stored = await db.project.findUniqueOrThrow({ where: { id: draftId } });
    expect(stored.lifecycleStatus).toBe('ACTIVE');
    expect(stored.currentStep).toBe('COMPLETED');
    expect(stored.activatedAt).not.toBeNull();
    expect(await db.task.count({ where: { projectId: draftId, workstream: 'DEVELOPMENT' } })).toBe(1);
    expect(await db.projectWorkstream.count({ where: { projectId: draftId, workstream: 'DEVELOPMENT' } })).toBe(1);
  });
  it('restores a draft without partial work when activation setup fails', async () => {
    const created = await post('/projects/drafts', 'admin').send({
      name: 'Rollback Draft Product',
      productType: 'GAME',
      currentStep: 'REVIEW',
      developmentEnabled: true,
      marketingEnabled: false,
    });
    expect(created.status).toBe(201);
    const draftId = created.body.data.id;

    const activated = await post(`/projects/drafts/${draftId}/activate`, 'admin').send({});
    expect(activated.status).toBe(400);
    const stored = await db.project.findUniqueOrThrow({ where: { id: draftId } });
    expect(stored.lifecycleStatus).toBe('DRAFT');
    expect(stored.currentStep).toBe('REVIEW');
    expect(stored.activatedAt).toBeNull();
    expect(await db.task.count({ where: { projectId: draftId } })).toBe(0);
    expect(await db.projectWorkstream.count({ where: { projectId: draftId } })).toBe(0);
    expect(await db.auditLog.count({ where: { entityId: draftId, action: 'PROJECT_ACTIVATION_ROLLED_BACK' } })).toBe(1);
  });
  it('makes concurrent Create Product requests idempotent', async () => {
    const created = await post('/projects/drafts', 'admin').send({
      name: 'Double Click Draft',
      productType: 'APP',
      currentStep: 'REVIEW',
      developmentEnabled: true,
      marketingEnabled: false,
    });
    expect(created.status).toBe(201);
    const draftId = created.body.data.id;

    const responses = await Promise.all([
      post(`/projects/drafts/${draftId}/activate`, 'admin').send({}),
      post(`/projects/drafts/${draftId}/activate`, 'admin').send({}),
    ]);
    expect(responses.some((response) => response.status === 201)).toBe(true);
    expect(responses.every((response) => [201, 400].includes(response.status))).toBe(true);
    expect(await db.task.count({ where: { projectId: draftId, workstream: 'DEVELOPMENT' } })).toBe(1);
    expect(await db.projectWorkstream.count({ where: { projectId: draftId, workstream: 'DEVELOPMENT' } })).toBe(1);
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
  it('initializes Marketing once and enforces Product and record ownership', async () => {
    await ensureSession('a');
    await ensureSession('b');
    await ensureSession('admin');
    const marketingProject = await db.project.create({ data: {
      key: 'MKTSEC', name: 'Marketing Security Product', projectManagerId: users.admin.id,
      targetDate: new Date('2026-10-15T00:00:00.000Z'), members: { create: { userId: users.a.id } },
    } });

    const initialized = await post(`/projects/${marketingProject.id}/marketing/initialize`, 'admin').send({});
    expect(initialized.status).toBe(201);
    expect(initialized.body.data?.checklistItems ?? initialized.body.checklistItems).toBe(38);
    expect(await db.task.count({ where: { projectId: marketingProject.id, workstream: 'MARKETING' } })).toBe(38);
    expect(await db.marketingChannel.count({ where: { projectId: marketingProject.id } })).toBe(16);
    expect(await db.marketingContentItem.count({ where: { projectId: marketingProject.id } })).toBe(10);
    expect(await db.marketingBuzzActivity.count({ where: { projectId: marketingProject.id } })).toBe(7);
    expect(await db.marketingGate.count({ where: { projectId: marketingProject.id } })).toBe(4);
    expect(await db.marketingSignoffItem.count({ where: { projectId: marketingProject.id } })).toBe(8);

    const checklistItem = await db.task.findFirstOrThrow({ where: { projectId: marketingProject.id, checklistCode: 'MI-01' } });
    const secondChecklistItem = await db.task.findFirstOrThrow({ where: { projectId: marketingProject.id, checklistCode: 'MI-02' } });
    await db.task.updateMany({ where: { id: { in: [checklistItem.id, secondChecklistItem.id] } }, data: { assigneeId: users.a.id, status: 'READY', allowParallelWork: false } });
    expect((await patch(`/tasks/${checklistItem.id}`, 'a').send({ status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await patch(`/tasks/${secondChecklistItem.id}`, 'a').send({ status: 'IN_PROGRESS' })).status).toBe(200);
    expect((await patch(`/tasks/${checklistItem.id}`, 'a').send({ status: 'IN_REVIEW', checklistEvidenceUrl: 'https://example.com/evidence', checklistNotes: 'Account ownership verified.' })).status).toBe(200);
    expect((await patch(`/tasks/${checklistItem.id}`, 'b').send({ checklistNotes: 'spoofed' })).status).toBe(404);
    expect((await post(`/tasks/${checklistItem.id}/review`, 'admin').send({ status: 'APPROVED', completeTask: true })).status).toBe(201);
    const completedChecklistItem = await db.task.findUniqueOrThrow({ where: { id: checklistItem.id } });
    expect(completedChecklistItem.status).toBe('DONE');
    expect(completedChecklistItem.checklistEvidenceUrl).toBe('https://example.com/evidence');

    const repeated = await post(`/projects/${marketingProject.id}/marketing/initialize`, 'admin').send({});
    expect(repeated.status).toBe(201);
    expect(repeated.body.data?.alreadyInitialized ?? repeated.body.alreadyInitialized).toBe(true);
    expect(await db.task.count({ where: { projectId: marketingProject.id, workstream: 'MARKETING' } })).toBe(38);

    expect((await get(`/projects/${marketingProject.id}/marketing/summary`, 'b')).status).toBe(404);
    expect((await get(`/projects/${marketingProject.id}/marketing/channels`, 'a')).status).toBe(403);
    await db.project.update({ where: { id: marketingProject.id }, data: { marketingOwnerId: users.a.id } });
    expect((await get(`/projects/${marketingProject.id}/marketing/channels`, 'a')).status).toBe(200);

    const content = await db.marketingContentItem.findFirstOrThrow({ where: { projectId: marketingProject.id } });
    expect((await patch(`/projects/${marketingProject.id}/marketing/content/${content.id}`, 'admin').send({ ownerId: users.a.id })).status).toBe(200);
    expect((await patch(`/projects/${marketingProject.id}/marketing/content/${content.id}`, 'a').send({ assetStatus: 'IN_PRODUCTION' })).status).toBe(200);
    expect((await patch(`/projects/${marketingProject.id}/marketing/content/${content.id}`, 'b').send({ assetStatus: 'READY' })).status).toBe(404);
    const gate = await db.marketingGate.findFirstOrThrow({ where: { projectId: marketingProject.id } });
    expect((await patch(`/projects/${marketingProject.id}/marketing/gates/${gate.id}`, 'a').send({ status: 'APPROVED' })).status).toBe(403);
    expect((await patch(`/projects/${marketingProject.id}/marketing/gates/${gate.id}`, 'admin').send({ status: 'APPROVED' })).status).toBe(400);

    const completedWindow = await db.marketingBuzzActivity.findFirstOrThrow({ where: { projectId: marketingProject.id }, orderBy: { startDate: 'asc' } });
    await db.marketingBuzzActivity.update({ where: { id: completedWindow.id }, data: { status: 'DONE' } });
    const originalCompletedDate = completedWindow.startDate.toISOString();
    const preview = await get(`/projects/${marketingProject.id}/marketing/reschedule-preview?targetDate=2026-11-15`, 'admin');
    expect(preview.status).toBe(200);
    expect((preview.body.data ?? preview.body)).toHaveLength(6);
    expect((await patch(`/projects/${marketingProject.id}/marketing/reschedule`, 'admin').send({ targetDate: '2026-11-15' })).status).toBe(200);
    expect((await db.marketingBuzzActivity.findUniqueOrThrow({ where: { id: completedWindow.id } })).startDate.toISOString()).toBe(originalCompletedDate);

    const signoff = await db.marketingSignoffItem.findFirstOrThrow({ where: { projectId: marketingProject.id } });
    expect((await patch(`/projects/${marketingProject.id}/marketing/signoff/${signoff.id}`, 'admin').send({ marketingCheck: 'VERIFIED' })).status).toBe(200);
    expect((await patch(`/projects/${marketingProject.id}/marketing/signoff/${signoff.id}`, 'admin').send({ pmCheck: 'VERIFIED' })).status).toBe(200);
    expect((await db.marketingSignoffItem.findUniqueOrThrow({ where: { id: signoff.id } })).finalStatus).toBe('READY');
    const audit = await db.auditLog.findFirst({ where: { action: 'MARKETING_WORKSPACE_INITIALIZED', entityId: marketingProject.id } });
    expect(audit?.actorId).toBe(users.admin.id);
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
  it('keeps job roles separate from access permissions and validates membership', async () => {
    await ensureSession('admin');
    await ensureSession('a');
    expect((await post('/users/job-roles', 'a').send({ name: 'Designer' })).status).toBe(403);
    const created = await post('/users/job-roles', 'owner').send({ name: 'Designer', category: 'DESIGN' });
    expect(created.status).toBe(201);
    const role = created.body.data ?? created.body;
    expect((await patch(`/users/${users.a.id}`, 'admin').send({ functionalRoleIds: [role.id] })).status).toBe(200);
    expect((await db.user.findUniqueOrThrow({ where: { id: users.a.id } })).globalRole).toBe('TEAM_MEMBER');
    expect((await patch(`/users/${users.a.id}`, 'admin').send({ functionalRoleIds: ['missing'] })).status).toBe(400);
    expect((await patch(`/users/job-roles/${role.id}`, 'admin').send({ isActive: false })).status).toBe(403);
    expect((await patch(`/users/job-roles/${role.id}`, 'owner').send({ isActive: false })).status).toBe(400);
    expect((await patch(`/users/${users.a.id}`, 'admin').send({ functionalRoleIds: [role.id] })).status).toBe(200);
    expect((await patch(`/users/${users.b.id}`, 'admin').send({ functionalRoleIds: [role.id] })).status).toBe(200);
  });
  it('preserves progress and assignment history on an eligible reassignment', async () => {
    await ensureSession('admin');
    const p = await db.project.create({ data: { key: 'PHASETEST', name: 'Phase test', projectManagerId: users.admin.id, members: { create: [{ userId: users.a.id }, { userId: users.b.id }] } } });
    const role = await db.functionalRole.create({ data: { code: 'TEST_DEVELOPER', name: 'Test Developer', category: 'ENGINEERING' } });
    const managerRole = await db.functionalRole.create({ data: { code: 'TEST_MANAGER', name: 'Test Manager', category: 'MANAGEMENT' } });
    await db.userFunctionalRole.createMany({ data: [{ userId: users.a.id, functionalRoleId: role.id }, { userId: users.b.id, functionalRoleId: role.id }] });
    const members = await db.projectMember.findMany({ where: { projectId: p.id } });
    await db.projectMemberRoleAssignment.createMany({ data: members.map((member) => ({ projectMemberId: member.id, functionalRoleId: role.id })) });
    await db.userFunctionalRole.create({ data: { userId: users.admin.id, functionalRoleId: managerRole.id } });
    const managerMember = await db.projectMember.create({ data: { projectId: p.id, userId: users.admin.id } });
    await db.projectMemberRoleAssignment.create({ data: { projectMemberId: managerMember.id, functionalRoleId: managerRole.id } });
    const template = await db.checklistTemplateItem.create({ data: { code: 'TEST-PHASE', phase: 'Test', title: 'Test', ownerRole: 'TEST_DEVELOPER', defaultOrder: 999, eligibleRoles: { create: [{ functionalRoleId: role.id, isPrimary: true }, { functionalRoleId: managerRole.id }] } } });
    const task = await db.task.create({ data: { title: 'Phase task', humanId: 'PHASETEST-101', taskNumber: 101, projectId: p.id, creatorId: users.admin.id, assigneeId: users.a.id, workstream: 'DEVELOPMENT', workType: 'STANDARD_CHECKLIST', checklistTemplateItemId: template.id, checklistPhase: 'Test', status: 'IN_PROGRESS', progress: 20 } });
    const unassignedTask = await db.task.create({ data: { title: 'Unassigned phase task', humanId: 'PHASETEST-102', taskNumber: 102, projectId: p.id, creatorId: users.admin.id, workstream: 'DEVELOPMENT', workType: 'STANDARD_CHECKLIST', checklistTemplateItemId: template.id, checklistPhase: 'Test', status: 'UNASSIGNED' } });
    const workspaceResponse = await get(`/projects/${p.id}/assignment-workspace?workstream=DEVELOPMENT`, 'admin');
    expect(workspaceResponse.status).toBe(200);
    const workspace = workspaceResponse.body.data ?? workspaceResponse.body;
    expect(workspace.phases[0].phaseKey).toBe('Test');
    expect(workspace.members.map((member: { id: string }) => member.id).sort()).toEqual([users.a.id, users.b.id, users.admin.id].sort());
    expect((await post(`/projects/${p.id}/phase-assignments/apply`, 'admin').send({ workstream: 'DEVELOPMENT', assignments: [{ phaseKey: 'Test', defaultAssigneeId: users.b.id, additionalMemberIds: [users.a.id], reassignActive: false }] })).status).toBe(201);
    expect((await db.task.findUniqueOrThrow({ where: { id: task.id } })).assigneeId).toBe(users.a.id);
    expect((await db.task.findUniqueOrThrow({ where: { id: unassignedTask.id } })).assigneeId).toBe(users.b.id);
    expect((await db.projectPhaseAssignment.findUniqueOrThrow({ where: { projectId_workstream_phaseKey: { projectId: p.id, workstream: 'DEVELOPMENT', phaseKey: 'Test' } } })).defaultAssigneeId).toBe(users.b.id);
    expect(await db.auditLog.count({ where: { actorId: users.admin.id, action: 'DEVELOPMENT_PHASE_ASSIGNED', entityType: 'ProjectPhaseAssignment' } })).toBeGreaterThan(0);
    expect(await db.auditLog.count({ where: { actorId: users.admin.id, action: 'PHASE_MEMBER_ADDED', entityType: 'ProjectPhaseAssignment' } })).toBe(2);
    expect(await db.taskAssignmentHistory.count({ where: { taskId: unassignedTask.id, previousAssigneeId: null, newAssigneeId: users.b.id } })).toBe(1);
    expect((await patch(`/projects/${p.id}/checklist/${task.id}/assignment`, 'admin').send({ assigneeId: users.b.id, confirmReassignment: true, reason: 'Coverage change' })).status).toBe(200);
    expect((await db.task.findUniqueOrThrow({ where: { id: task.id } }))).toMatchObject({ assigneeId: users.b.id, status: 'IN_PROGRESS', progress: 20 });
    expect(await db.taskAssignmentHistory.count({ where: { taskId: task.id, previousAssigneeId: users.a.id, newAssigneeId: users.b.id } })).toBe(1);
    expect((await del(`/projects/${p.id}/members/${users.b.id}`, 'admin')).status).toBe(400);
    expect((await patch(`/projects/${p.id}/members/${users.b.id}/roles`, 'admin').send({ functionalRoleIds: [] })).status).toBe(400);
    expect((await get(`/projects/${p.id}/assignment-workspace?workstream=DEVELOPMENT`, 'a')).status).toBe(403);
    expect((await post(`/projects/${p.id}/phase-assignments/apply`, 'a').send({ workstream: 'DEVELOPMENT', assignments: [{ phaseKey: 'Test', defaultAssigneeId: users.a.id }] })).status).toBe(403);
  });
});
