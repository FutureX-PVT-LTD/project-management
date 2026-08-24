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

    // PM project authorization
    if (actorRole === UserRole.PROJECT_MANAGER) {
      const isPM =
        predTask.project.projectManagerId === actorId ||
        (await this.prisma.projectMember.findFirst({
          where: { projectId: predTask.projectId, userId: actorId, role: 'MANAGER' },
        }));
      if (!isPM) {
        throw new ForbiddenException(
          'Project Managers may only manage dependencies in projects they manage.',
        );
      }
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

    // If predecessor is not DONE, mark dependent task as BLOCKED
    if (predTask.status !== TaskStatus.DONE && depTask.status !== TaskStatus.DONE) {
      await this.prisma.task.update({
        where: { id: depTask.id },
        data: { status: TaskStatus.BLOCKED },
      });

      if (depTask.assigneeId) {
        await this.prisma.notification.create({
          data: {
            userId: depTask.assigneeId,
            type: NotificationType.TASK_BLOCKED,
            title: 'Task Blocked by Dependency',
            message: `"${depTask.title}" (${depTask.humanId}) is now waiting for "${predTask.title}" (${predTask.humanId}).`,
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

    if (actorRole === UserRole.PROJECT_MANAGER) {
      const isPM =
        dependency.dependentTask.project.projectManagerId === actorId ||
        (await this.prisma.projectMember.findFirst({
          where: {
            projectId: dependency.dependentTask.projectId,
            userId: actorId,
            role: 'MANAGER',
          },
        }));
      if (!isPM) {
        throw new ForbiddenException(
          'Project Managers may only manage dependencies in projects they manage.',
        );
      }
    }

    await this.prisma.taskDependency.delete({ where: { id } });

    // Check if dependent task is still blocked
    const remainingDeps = dependency.dependentTask.blockedBy.filter(
      (b) => b.id !== id && b.predecessorTask.status !== TaskStatus.DONE,
    );

    if (
      remainingDeps.length === 0 &&
      dependency.dependentTask.status === TaskStatus.BLOCKED &&
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
          description: `Dependency removed. Task is now READY.`,
        },
      });
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
