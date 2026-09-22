import { PrismaClient } from '@prisma/client';
import { TaskStatus } from '../../types/enums/task.enum';

export async function normalizeAllTasks(prisma: PrismaClient): Promise<number> {
  const allTasks = await prisma.task.findMany({
    where: { deletedAt: null },
  });

  let normalizedCount = 0;
  for (const task of allTasks) {
    // Leave active or closed tasks alone
    if (
      task.status === TaskStatus.DONE ||
      task.status === TaskStatus.N_A ||
      task.status === TaskStatus.CANCELED ||
      task.status === TaskStatus.IN_PROGRESS ||
      task.status === TaskStatus.IN_REVIEW ||
      task.isManualBlocked
    ) {
      continue;
    }

    if (task.assigneeId) {
      if (task.status === TaskStatus.WAITING || task.status === TaskStatus.BLOCKED || task.status === TaskStatus.TODO || task.status === TaskStatus.BACKLOG || task.status === TaskStatus.PLANNED) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.READY, progress: 0 },
        });
        normalizedCount++;
      }
    } else {
      // Unassigned work should stay visible to admins but hidden from employee queues.
      if (task.status === TaskStatus.TODO || task.status === TaskStatus.BACKLOG || task.status === TaskStatus.WAITING) {
        await prisma.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.UNASSIGNED, progress: 0 },
        });
        normalizedCount++;
      }
    }
  }

  return normalizedCount;
}
