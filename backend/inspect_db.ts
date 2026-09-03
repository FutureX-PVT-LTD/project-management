import { PrismaClient } from '@prisma/client';
import { normalizeAllTasks } from './src/modules/tasks/normalize-tasks.util';

const p = new PrismaClient();

async function run() {
  const normCount = await normalizeAllTasks(p);
  console.log('=== NORMALIZED COUNT ===', normCount);

  const users = await p.user.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, globalRole: true },
  });
  console.log('=== USERS ===\n', JSON.stringify(users, null, 2));

  const projects = await p.project.findMany({
    select: { id: true, name: true, key: true, status: true, health: true, healthReason: true },
  });
  console.log('=== PROJECTS ===\n', JSON.stringify(projects, null, 2));

  const tasks = await p.task.findMany({
    select: {
      id: true,
      humanId: true,
      title: true,
      status: true,
      priority: true,
      progress: true,
      assigneeId: true,
      assignee: { select: { firstName: true, lastName: true } },
      blockedBy: { include: { predecessorTask: { select: { humanId: true, title: true, status: true } } } },
    },
  });
  console.log('=== TASKS ===\n', JSON.stringify(tasks, null, 2));

  const activities = await p.taskActivity.findMany({
    orderBy: { createdAt: 'asc' },
  });
  console.log('=== ACTIVITIES ===\n', JSON.stringify(activities, null, 2));

  const allTasks = await p.task.findMany({
    include: {
      blockedBy: { include: { predecessorTask: true } },
      blocking: { include: { dependentTask: true } },
    }
  });
  console.log('=== FULL TASKS ===\n', JSON.stringify(allTasks, null, 2));
}

run().finally(() => p.$disconnect());
