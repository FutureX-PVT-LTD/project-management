import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DependencyGraphUtil } from '../../common/utils/dependency-graph.util';
import {
  CreateDependencyDto,
  TaskStatus,
  TaskActionType,
  NotificationType,
  UserRole,
} from '@futurex/shared';

@Injectable()
export class DependenciesService {
  constructor(private prisma: PrismaService) {}

  async addDependency(dto: CreateDependencyDto, actorId: string, actorRole?: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members are not permitted to manage dependencies.');
    }

    if (dto.predecessorTaskId === dto.dependentTaskId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const [predTask, depTask] = await Promise.all([
      this.prisma.task.findUnique({
        where: { id: dto.predecessorTaskId },
        include: { project: true },
      }),
      this.prisma.task.findUnique({
        where: { id: dto.dependentTaskId },
        include: { blockedBy: true, project: true },
      }),
    ]);

    if (!predTask || !depTask) {
      throw new NotFoundException('One or both tasks not found');
    }

    if (predTask.projectId !== depTask.projectId) {
      throw new BadRequestException('Tasks must belong to the same project');
    }

    // Check duplicate
    const existing = await this.prisma.taskDependency.findUnique({

      where: {
        predecessorTaskId_dependentTaskId: {
          predecessorTaskId: dto.predecessorTaskId,
          dependentTaskId: dto.dependentTaskId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('This dependency relationship already exists');
    }

    // Fetch all project dependencies to test for cycle
    const allProjectDeps = await this.prisma.taskDependency.findMany({
      where: {
        predecessorTask: { projectId: predTask.projectId },
      },
      select: { predecessorTaskId: true, dependentTaskId: true },
    });

    const wouldCycle = DependencyGraphUtil.wouldCreateCycle(
      allProjectDeps,
      dto.predecessorTaskId,
      dto.dependentTaskId,
    );

    if (wouldCycle) {
      throw new BadRequestException(
        `Circular dependency detected: Adding dependency between ${predTask.humanId} and ${depTask.humanId} would create an infinite dependency cycle.`,
      );
    }

    // Create dependency
    const dependency = await this.prisma.taskDependency.create({
      data: {
        predecessorTaskId: dto.predecessorTaskId,
        dependentTaskId: dto.dependentTaskId,
        type: dto.type || 'FINISH_TO_START',
      },
      include: {
        predecessorTask: {
          select: { id: true, humanId: true, title: true, status: true },
        },
        dependentTask: {
          select: { id: true, humanId: true, title: true, status: true },
        },
      },
    });

    // If predecessor is not DONE, mark dependent task as WAITING (if not manually blocked or already completed)
    if (predTask.status !== TaskStatus.DONE && depTask.status !== TaskStatus.DONE && depTask.status !== TaskStatus.CANCELED) {
      if (!depTask.isManualBlocked) {
        await this.prisma.task.update({
          where: { id: depTask.id },
          data: { status: TaskStatus.WAITING },
        });
      }

      if (depTask.assigneeId) {
        await this.prisma.notification.create({
          data: {
            userId: depTask.assigneeId,
            type: NotificationType.TASK_BLOCKED,
            title: 'Task Dependency Assigned',
            message: `"${depTask.title}" (${depTask.humanId}) is waiting for "${predTask.title}" (${predTask.humanId}).`,
            linkUrl: `/projects/${depTask.projectId}?taskId=${depTask.id}`,
          },
        });
      }
    }

    await this.prisma.taskActivity.create({
      data: {
        taskId: depTask.id,
        projectId: depTask.projectId,
        userId: actorId,
        actionType: TaskActionType.DEPENDENCY_ADDED,
        description: `Added dependency: Waiting for ${predTask.humanId} (${predTask.title})`,
      },
    });

    return dependency;
  }

  async removeDependency(id: string, actorId: string, actorRole?: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members are not permitted to manage dependencies.');
    }

    const dependency = await this.prisma.taskDependency.findUnique({
      where: { id },
      include: {
        predecessorTask: true,
        dependentTask: {
          include: {
            project: true,
            blockedBy: {
              include: { predecessorTask: true },
            },
          },
        },
      },
    });

    if (!dependency) {
      throw new NotFoundException('Dependency not found');
    }

    await this.prisma.taskDependency.delete({ where: { id } });


    // Check if dependent task has any remaining incomplete predecessors
    const remainingDeps = dependency.dependentTask.blockedBy.filter(
      (b) => b.id !== id && b.predecessorTask.status !== TaskStatus.DONE,
    );

    if (
      remainingDeps.length === 0 &&
      (dependency.dependentTask.status === TaskStatus.WAITING || dependency.dependentTask.status === TaskStatus.BLOCKED) &&
      !dependency.dependentTask.isManualBlocked
    ) {
      await this.prisma.task.update({
        where: { id: dependency.dependentTaskId },
        data: { status: TaskStatus.READY },
      });

      await this.prisma.taskActivity.create({
        data: {
          taskId: dependency.dependentTaskId,
          projectId: dependency.dependentTask.projectId,
          userId: actorId,
          actionType: TaskActionType.AUTOMATICALLY_UNBLOCKED,
          description: `All prerequisite dependencies satisfied. Task is now READY.`,
        },
      });

      if (dependency.dependentTask.assigneeId) {
        await this.prisma.notification.create({
          data: {
            userId: dependency.dependentTask.assigneeId,
            type: NotificationType.TASK_READY,
            title: 'Your task is ready to start',
            message: `"${dependency.dependentTask.title}" (${dependency.dependentTask.humanId}) is now ready to start. All prerequisites are completed.`,
            linkUrl: `/projects/${dependency.dependentTask.projectId}?taskId=${dependency.dependentTask.id}`,
          },
        });
      }
    }

    await this.prisma.taskActivity.create({
      data: {
        taskId: dependency.dependentTaskId,
        projectId: dependency.dependentTask.projectId,
        userId: actorId,
        actionType: TaskActionType.DEPENDENCY_REMOVED,
        description: `Removed dependency on ${dependency.predecessorTask.humanId}`,
      },
    });

    return { success: true, message: 'Dependency removed' };
  }
}
