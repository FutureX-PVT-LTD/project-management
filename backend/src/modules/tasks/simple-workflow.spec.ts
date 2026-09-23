import { TaskStatus, UserRole } from '@futurex/shared';
import { normalizeAllTasks } from './normalize-tasks.util';
import { TasksService } from './tasks.service';

describe('Simple task workflow', () => {
  function setupTransition(status: TaskStatus, progress: number) {
    const task = {
      id: 'task-1', humanId: 'PX-1', title: 'Build feature',
      projectId: 'project-1', milestoneId: null, assigneeId: 'member-1',
      status, progress, isManualBlocked: false, manualBlockReason: null,
      workstream: 'DEVELOPMENT', blockedBy: [], project: { deletedAt: null, projectManagerId: null, members: [{ userId: 'member-1' }] },
      parentTaskId: null, completedDate: null as Date | null,
      createdAt: new Date(), updatedAt: new Date(),
    };
    let currentTask = task;
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
      task: {
        findFirst: jest.fn().mockResolvedValue(task),
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(currentTask)),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation(({ data }) => {
          currentTask = { ...currentTask, ...data };
          return Promise.resolve(currentTask);
        }),
      },
      taskCollaborator: { findUnique: jest.fn().mockResolvedValue(null) },
      projectMember: { findUnique: jest.fn().mockResolvedValue({ id: 'membership-1' }) },
      user: {
        findUnique: jest.fn().mockResolvedValue({ firstName: 'Team', lastName: 'Member' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }, { id: 'owner-1' }]),
      },
      notification: { createMany: jest.fn().mockResolvedValue({ count: 2 }) },
      taskActivity: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      taskDependency: { findMany: jest.fn().mockResolvedValue([]) },
      project: { update: jest.fn().mockResolvedValue({}) },
    };
    const service = new TasksService(prisma as never);
    return { service, prisma };
  }

  it('lets a member complete their own 20% task and notifies both management roles', async () => {
    const { service, prisma } = setupTransition(TaskStatus.IN_PROGRESS, 20);

    await service.update('task-1', { status: TaskStatus.DONE }, 'member-1', UserRole.TEAM_MEMBER);

    expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'task-1' },
      data: expect.objectContaining({ status: TaskStatus.DONE, progress: 100, completedDate: expect.any(Date) }),
    }));
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ userId: 'admin-1', type: 'TASK_COMPLETED' }),
        expect.objectContaining({ userId: 'owner-1', type: 'TASK_COMPLETED' }),
      ]),
    });
  });

  it('starts another assigned task without checking for one-active-task limits', async () => {
    const { service, prisma } = setupTransition(TaskStatus.READY, 0);

    await service.update('task-1', { status: TaskStatus.IN_PROGRESS }, 'member-1', UserRole.TEAM_MEMBER);

    expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
    }));
    expect(prisma.task.findFirst).toHaveBeenCalledTimes(2);
  });

  it('makes dependency-waiting work startable without changing manual blockers or active work', async () => {
    const prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'waiting', assigneeId: 'member', status: TaskStatus.WAITING, isManualBlocked: false },
          { id: 'old-blocked', assigneeId: 'member', status: TaskStatus.BLOCKED, isManualBlocked: false },
          { id: 'manual-blocked', assigneeId: 'member', status: TaskStatus.BLOCKED, isManualBlocked: true },
          { id: 'doing', assigneeId: 'member', status: TaskStatus.IN_PROGRESS, isManualBlocked: false },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    expect(await normalizeAllTasks(prisma as never)).toBe(2);
    expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: 'waiting' }, data: { status: TaskStatus.READY, progress: 0 } });
    expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: 'old-blocked' }, data: { status: TaskStatus.READY, progress: 0 } });
    expect(prisma.task.update).not.toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'manual-blocked' } }));
  });

  it('keeps earlier review items visible alongside completed work', async () => {
    const findMany = jest.fn()
      .mockResolvedValueOnce([{ id: 'old-review', status: TaskStatus.IN_REVIEW }])
      .mockResolvedValueOnce([{ id: 'completed', status: TaskStatus.DONE }]);
    const service = new TasksService({ task: { findMany } } as never);

    const result = await service.completedFeed({ search: 'sample' });

    expect(result.map((task) => task.id)).toEqual(['old-review', 'completed']);
    expect(findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: expect.objectContaining({ status: TaskStatus.IN_REVIEW }), take: 100 }));
    expect(findMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: expect.objectContaining({ status: TaskStatus.DONE }), take: 100 }));
  });

  it('refreshes overview progress, development readiness, and current phase together', async () => {
    const prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([
          { progress: 100, estimatedHours: null, status: TaskStatus.DONE, workType: 'STANDARD_CHECKLIST', workstream: 'DEVELOPMENT', checklistOrder: 1, checklistPhase: 'Concept' },
          { progress: 50, estimatedHours: null, status: TaskStatus.IN_PROGRESS, workType: 'STANDARD_CHECKLIST', workstream: 'DEVELOPMENT', checklistOrder: 2, checklistPhase: 'Scope' },
          { progress: 0, estimatedHours: null, status: TaskStatus.READY, workType: 'STANDARD_CHECKLIST', workstream: 'MARKETING', checklistOrder: 1, checklistPhase: 'Identity' },
        ]),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
    };
    const service = new TasksService(prisma as never);

    await (service as any).updateRollups('project-1');

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: { progress: 50, launchReadiness: 50, currentPhase: 'Scope' },
    });
  });

  it('resets stale overview rollups when no applicable tasks remain', async () => {
    const prisma = {
      task: { findMany: jest.fn().mockResolvedValue([]) },
      project: { update: jest.fn().mockResolvedValue({}) },
    };
    const service = new TasksService(prisma as never);

    await (service as any).updateRollups('project-1');

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'project-1' },
      data: { progress: 0, launchReadiness: 0, currentPhase: null },
    });
  });
});
