import { PrismaClient } from '@prisma/client';
import { TaskStatus } from '../../types/enums/task.enum';

export async function normalizeAllTasks(prisma: PrismaClient): Promise<number> {
  const allTasks = await prisma.task.findMany({
    where: { deletedAt: null },
    include: {
      blockedBy: {
        include: {
          predecessorTask: { select: { id: true, status: true } },
        },
      },
    },
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

    const unfinishedPredecessors = task.blockedBy.filter(
      (b) => b.predecessorTask.status !== TaskStatus.DONE && b.predecessorTask.status !== TaskStatus.N_A,
    );

    if (task.assigneeId) {
      // Assigned task must resolve to WAITING or READY
      if (unfinishedPredecessors.length > 0) {
        if (task.status !== TaskStatus.WAITING) {
          await prisma.task.update({
            where: { id: task.id },
            data: { status: TaskStatus.WAITING, progress: 0 },
          });
          normalizedCount++;
        }
      } else {
        if (task.status !== TaskStatus.READY) {
          await prisma.task.update({
            where: { id: task.id },
            data: { status: TaskStatus.READY, progress: 0 },
          });
          normalizedCount++;
        }
      }
    } else {
      // Unassigned work should stay visible to admins but hidden from employee queues.
      if (task.status === TaskStatus.TODO || task.status === TaskStatus.BACKLOG) {
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
