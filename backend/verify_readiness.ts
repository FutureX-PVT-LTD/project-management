import { PrismaClient } from '@prisma/client';
import { TaskStatus } from './src/types/enums/task.enum';

const p = new PrismaClient();

async function verify() {
  console.log('=== SYSTEM VERIFICATION ===');
  const project = await p.project.findFirst();
  const user = await p.user.findFirst({ where: { globalRole: 'TEAM_MEMBER' } });
  const tasks = await p.task.findMany({
    select: { id: true, humanId: true, title: true, status: true, progress: true, assigneeId: true },
  });

  console.log('Found project:', project?.name, `(key: ${project?.key})`);
  console.log('Found employee:', user?.firstName, user?.lastName, `(${user?.email})`);
  console.log('Active Tasks in DB:');
  for (const t of tasks) {
    console.log(`- ${t.humanId}: status=${t.status}, progress=${t.progress}%, assignee=${t.assigneeId ? 'Assigned' : 'Unassigned'}`);
  }
}

verify().finally(() => p.$disconnect());
