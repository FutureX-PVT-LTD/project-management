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
import { requireProject } from '../../common/security/access-policy';

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

    await requireProject(this.prisma, predTask.projectId, {
      id: actorId,
      globalRole: actorRole || UserRole.TEAM_MEMBER,
    });

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

    // If predecessor is not satisfied, mark dependent task as WAITING (if not manually blocked or already completed)
    const predecessorSatisfied = predTask.status === TaskStatus.DONE || predTask.status === TaskStatus.N_A;
    if (
      !predecessorSatisfied &&
      depTask.status !== TaskStatus.DONE &&
      depTask.status !== TaskStatus.N_A &&
      depTask.status !== TaskStatus.CANCELED
    ) {
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

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'DEPENDENCY_ADDED',
        entityType: 'TaskDependency',
        entityId: dependency.id,
        detailsJson: JSON.stringify({
          predecessorTaskId: dto.predecessorTaskId,
          dependentTaskId: dto.dependentTaskId,
          projectId: predTask.projectId,
        }),
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

    await requireProject(this.prisma, dependency.dependentTask.projectId, {
      id: actorId,
      globalRole: actorRole || UserRole.TEAM_MEMBER,
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.taskDependency.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'DEPENDENCY_REMOVED',
          entityType: 'TaskDependency',
          entityId: id,
          detailsJson: JSON.stringify({
            predecessorTaskId: dependency.predecessorTaskId,
            dependentTaskId: dependency.dependentTaskId,
            projectId: dependency.dependentTask.projectId,
          }),
        },
      });
    });

    // Check if dependent task has any remaining incomplete predecessors
    const remainingDeps = dependency.dependentTask.blockedBy.filter(
      (b) =>
        b.id !== id &&
        b.predecessorTask.status !== TaskStatus.DONE &&
        b.predecessorTask.status !== TaskStatus.N_A,
    );

    if (
      remainingDeps.length === 0 &&
      (dependency.dependentTask.status === TaskStatus.WAITING || dependency.dependentTask.status === TaskStatus.BLOCKED) &&
      !dependency.dependentTask.isManualBlocked
    ) {
      const targetStatus = dependency.dependentTask.assigneeId ? TaskStatus.READY : TaskStatus.UNASSIGNED;
      await this.prisma.task.update({
        where: { id: dependency.dependentTaskId },
        data: { status: targetStatus },
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
