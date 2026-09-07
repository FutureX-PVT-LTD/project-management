import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTaskDailyUpdateDto,
  CreateTaskDto,
  ReviewTaskDto,
  UpdateTaskDto,
} from './dto/create-task.dto';
import { IdGeneratorUtil } from '../../common/utils/id-generator.util';
import { DependencyGraphUtil } from '../../common/utils/dependency-graph.util';
import {
  UserRole,
  TaskStatus,
  TaskPriority,
  ReviewStatus,
  TaskActionType,
  NotificationType,
} from '@futurex/shared';
import { normalizeAllTasks } from './normalize-tasks.util';

@Injectable()
export class TasksService implements OnModuleInit {
  private readonly logger = new Logger(TasksService.name);

  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const count = await normalizeAllTasks(this.prisma);
      if (count > 0) {
        this.logger.log(`Initialized and normalized ${count} task(s) into READY/WAITING states.`);
      }
    } catch (err) {
      this.logger.warn(`Task normalization on startup warning: ${err}`);
    }
  }

  async findMyWork(
    userId: string,
    params?: {
      tab?: string; // ALL, READY, IN_PROGRESS, REVIEW, BLOCKED, DUE_SOON, OVERDUE, COMPLETED
      status?: TaskStatus;
      projectId?: string;
      priority?: TaskPriority;
      search?: string;
      sortBy?: string;
    },
  ) {
    // 1. Auto-normalize any legacy or ambiguously staged assigned tasks for this user
    try {
      const legacyAssigned = await this.prisma.task.findMany({
        where: {
          deletedAt: null,
          OR: [{ assigneeId: userId }, { collaborators: { some: { userId } } }],
          status: { in: ['TODO', 'BACKLOG', 'PLANNED'] },
        },
        include: {
          blockedBy: {
            include: { predecessorTask: { select: { id: true, status: true } } },
          },
        },
      });

      for (const t of legacyAssigned) {
        const hasUnfinished = t.blockedBy.some((b) => b.predecessorTask.status !== TaskStatus.DONE);
        const resolvedStatus = hasUnfinished ? TaskStatus.WAITING : TaskStatus.READY;
        await this.prisma.task.update({
          where: { id: t.id },
          data: { status: resolvedStatus, progress: 0 },
        });
      }
    } catch (err) {
      this.logger.warn(`Failed inline normalization in findMyWork: ${err}`);
    }

    const andConditions: any[] = [
      {
        OR: [{ assigneeId: userId }, { collaborators: { some: { userId } } }],
      },
    ];

    if (params?.projectId) {
      andConditions.push({ projectId: params.projectId });
    }

    if (params?.priority) {
      andConditions.push({ priority: params.priority });
    }

    if (params?.search) {
      const search = params.search.trim();
      andConditions.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { humanId: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where: any = {
      deletedAt: null,
      AND: andConditions,
    };

    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Apply tab filter
    switch (params?.tab) {
      case 'READY':
        where.status = TaskStatus.READY;
        break;
      case 'WAITING':
        where.status = TaskStatus.WAITING;
        break;
      case 'IN_PROGRESS':
        where.status = TaskStatus.IN_PROGRESS;
        break;
      case 'REVIEW':
        where.status = TaskStatus.IN_REVIEW;
        break;
      case 'BLOCKED':
        where.status = TaskStatus.BLOCKED;
        break;
      case 'DUE_SOON':
        where.dueDate = { gte: now, lte: threeDaysFromNow };
        where.status = { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] };
        break;
      case 'OVERDUE':
        where.dueDate = { lt: now };
        where.status = { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] };
        break;
      case 'COMPLETED':
        where.status = TaskStatus.DONE;
        break;
      default:
        // 'ALL' tab - optionally filter specific status if passed
        if (params?.status) {
          where.status = params.status;
        }
        break;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, key: true, name: true } },
        milestone: { select: { id: true, name: true } },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        blockedBy: {
          include: {
            predecessorTask: {
              select: {
                id: true,
                humanId: true,
                title: true,
                status: true,
                assignee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        subtasks: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
    });

    // Priority Work Ordering: Overdue -> Urgent -> High -> Due Soon -> Ready -> In Progress -> Waiting -> Blocked -> Other
    const priorityWeight: Record<string, number> = {
      URGENT: 100,
      HIGH: 80,
      MEDIUM: 50,
      LOW: 20,
      NONE: 0,
    };

    const statusWeight: Record<string, number> = {
      READY: 60,
      IN_PROGRESS: 50,
      IN_REVIEW: 40,
      WAITING: 35,
      PLANNED: 30,
      TODO: 30,
      BLOCKED: 20,
      BACKLOG: 10,
      DONE: 0,
      CANCELED: -10,
    };

    tasks.sort((a, b) => {
      const aOverdue = a.dueDate && new Date(a.dueDate) < now && a.status !== TaskStatus.DONE;
      const bOverdue = b.dueDate && new Date(b.dueDate) < now && b.status !== TaskStatus.DONE;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;

      const sDiff = (statusWeight[b.status] || 0) - (statusWeight[a.status] || 0);
      if (sDiff !== 0) return sDiff;

      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return tasks.map((t) => this.mapTaskToDto(t));
  }

  async findAll(
    params: {
      projectId?: string;
      milestoneId?: string;
      assigneeId?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      search?: string;
      parentTaskId?: string | null;
    },
    actorId?: string,
    actorRole?: UserRole,
  ) {
    const where: any = { deletedAt: null };

    if (params.projectId) where.projectId = params.projectId;
    if (params.milestoneId) where.milestoneId = params.milestoneId;
    if (params.assigneeId) where.assigneeId = params.assigneeId;
    if (params.status) where.status = params.status;
    if (params.priority) where.priority = params.priority;
    if (params.parentTaskId !== undefined) where.parentTaskId = params.parentTaskId;

    // Role-based visibility for team members and project managers
    if (actorRole && actorRole !== UserRole.OWNER && actorRole !== UserRole.ADMIN) {
      where.project = {
        OR: [
          { projectManagerId: actorId },
          { members: { some: { userId: actorId } } },
        ],
      };
    }

    if (params.search) {
      const search = params.search.trim();
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { humanId: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, key: true, name: true } },
        milestone: { select: { id: true, name: true } },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        blockedBy: {
          include: {
            predecessorTask: {
              select: {
                id: true,
                humanId: true,
                title: true,
                status: true,
                assignee: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
          },
        },
        blocking: {
          include: {
            dependentTask: {
              select: {
                id: true,
                humanId: true,
                title: true,
                status: true,
                assignee: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
          },
        },
        subtasks: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
      orderBy: [{ priority: 'asc' }, { taskNumber: 'asc' }],
    });

    return tasks.map((t) => this.mapTaskToDto(t));
  }

  async findById(id: string, actorId?: string, actorRole?: UserRole) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: {
        project: {
          select: {
            id: true,
            key: true,
            name: true,
            projectManagerId: true,
            members: { select: { userId: true, role: true } },
          },
        },
        milestone: { select: { id: true, name: true } },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        collaborators: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                jobTitle: true,
              },
            },
          },
        },
        parentTask: {
          select: { id: true, humanId: true, title: true },
        },
        subtasks: {
          where: { deletedAt: null },
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
          orderBy: { taskNumber: 'asc' },
        },
        blockedBy: {
          include: {
            predecessorTask: {
              select: {
                id: true,
                humanId: true,
                title: true,
                status: true,
                assignee: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
          },
        },
        blocking: {
          include: {
            dependentTask: {
              select: {
                id: true,
                humanId: true,
                title: true,
                status: true,
                assignee: {
                  select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
              },
            },
          },
        },
        reviews: {
          orderBy: { reviewedAt: 'desc' },
          take: 1,
          include: {
            reviewer: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        dailyUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 14,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true },
            },
            attachment: {
              select: { id: true, fileName: true, fileUrl: true, fileSize: true, mimeType: true },
            },
          },
        },
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true },
            },
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploader: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Role-based access validation
    if (actorRole && actorRole !== UserRole.OWNER && actorRole !== UserRole.ADMIN && actorId) {
      const isManager = task.project.projectManagerId === actorId;
      const isMember = task.project.members.some((m) => m.userId === actorId);
      const isAssignee = task.assigneeId === actorId;
      const isCollaborator = task.collaborators?.some((c) => c.user?.id === actorId || (c as any).userId === actorId);

      if (!isManager && !isMember && !isAssignee && !isCollaborator) {
        throw new ForbiddenException('You do not have permission to view this task');
      }
    }

    return this.mapTaskToDto(task);
  }

  async create(dto: CreateTaskDto, creatorId: string, creatorRole?: UserRole) {
    if (creatorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members are not permitted to create tasks.');
    }

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: {
          id: dto.assigneeId,
          globalRole: UserRole.TEAM_MEMBER,
          isActive: true,
          deletedAt: null,
          projectMemberships: { some: { projectId: dto.projectId } },
        },
        select: { id: true },
      });

      if (!assignee) {
        throw new BadRequestException({
          code: 'INVALID_PROJECT_ASSIGNEE',
          message: 'Select an active team member who belongs to this project.',
        });
      }
    }

    if (dto.dependsOnTaskIds?.length) {
      const uniqueDependencyIds = new Set(dto.dependsOnTaskIds);
      if (uniqueDependencyIds.size !== dto.dependsOnTaskIds.length) {
        throw new BadRequestException('Duplicate task dependencies are not allowed.');
      }

      const predecessors = await this.prisma.task.findMany({
        where: {
          id: { in: dto.dependsOnTaskIds },
          deletedAt: null,
        },
        select: { id: true, projectId: true },
      });

      if (predecessors.length !== dto.dependsOnTaskIds.length) {
        throw new BadRequestException('One or more prerequisite tasks were not found.');
      }

      const crossProjectDependency = predecessors.some((p) => p.projectId !== dto.projectId);
      if (crossProjectDependency) {
        throw new BadRequestException('Prerequisite tasks must belong to the same project.');
      }
    }

    // Determine next task number for this project
    const lastTask = await this.prisma.task.findFirst({
      where: { projectId: dto.projectId },
      orderBy: { taskNumber: 'desc' },
      select: { taskNumber: true },
    });

    const taskNumber = (lastTask?.taskNumber || 100) + 1;
    const humanId = IdGeneratorUtil.generateHumanTaskId(project.key, taskNumber);

    // Initial status & progress validation
    let initialStatus = dto.status;
    let initialProgress = dto.progress !== undefined ? dto.progress : 0;

    if (dto.assigneeId) {
      // Assigned task must resolve to WAITING or READY by default
      if (
        !initialStatus ||
        initialStatus === TaskStatus.TODO ||
        initialStatus === TaskStatus.BACKLOG ||
        initialStatus === TaskStatus.PLANNED
      ) {
        initialStatus = TaskStatus.READY;
      }
    } else {
      if (!initialStatus || initialStatus === TaskStatus.TODO || initialStatus === TaskStatus.BACKLOG) {
        initialStatus = TaskStatus.PLANNED;
      }
    }

    // If initial dependencies are passed, check if any predecessor is not DONE
    if (dto.dependsOnTaskIds && dto.dependsOnTaskIds.length > 0) {
      const predecessors = await this.prisma.task.findMany({
        where: { id: { in: dto.dependsOnTaskIds } },
        select: { id: true, status: true },
      });

      const allDone = predecessors.every((p) => p.status === TaskStatus.DONE);
      if (!allDone && dto.assigneeId && initialStatus !== TaskStatus.BLOCKED && initialStatus !== TaskStatus.DONE) {
        initialStatus = TaskStatus.WAITING;
        initialProgress = 0;
      }
    }

    if (initialStatus === TaskStatus.DONE) {
      initialProgress = 100;
    } else if (initialStatus === TaskStatus.IN_PROGRESS) {
      if (initialProgress === 0) initialProgress = 10;
      if (initialProgress >= 100) initialProgress = 99;
    } else {
      initialProgress = 0;
    }

    const task = await this.prisma.task.create({
      data: {
        taskNumber,
        humanId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        projectId: dto.projectId,
        milestoneId: dto.milestoneId,
        creatorId,
        assigneeId: dto.assigneeId,
        priority: dto.priority || TaskPriority.MEDIUM,
        status: initialStatus,
        progress: initialProgress,
        estimatedHours: dto.estimatedHours,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        requiresReview: dto.requiresReview || false,
        parentTaskId: dto.parentTaskId,
        collaborators: dto.collaboratorIds?.length
          ? {
              create: dto.collaboratorIds.map((userId) => ({ userId })),
            }
          : undefined,
        blockedBy: dto.dependsOnTaskIds?.length
          ? {
              create: dto.dependsOnTaskIds.map((predecessorTaskId) => ({
                predecessorTaskId,
              })),
            }
          : undefined,
      },
    });

    // Record activity
    await this.recordActivity(
      task.id,
      task.projectId,
      creatorId,
      TaskActionType.CREATED,
      `Task created (${task.humanId})`,
    );

    // Notify assignee if assigned
    if (dto.assigneeId && dto.assigneeId !== creatorId) {
      await this.prisma.notification.create({
        data: {
          userId: dto.assigneeId,
          type: NotificationType.TASK_ASSIGNED,
          title: 'New Task Assigned',
          message: `You were assigned to "${task.title}" (${task.humanId})`,
          linkUrl: `/projects/${task.projectId}?taskId=${task.id}`,
        },
      });
    }

    // Update project and milestone progress
    await this.updateRollups(task.projectId, task.milestoneId);

    return this.findById(task.id);
  }

  async update(
    id: string,
    dto: UpdateTaskDto,
    actorId: string,
    actorRole: UserRole,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: {
        project: true,
        parentTask: { select: { id: true, assigneeId: true } },
        blockedBy: {
          include: { predecessorTask: { select: { id: true, humanId: true, status: true } } },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Subtask indicator
    const isSubtask = !!task.parentTaskId;

    // Permission check
    const isOwnerOrAdmin = actorRole === UserRole.OWNER || actorRole === UserRole.ADMIN;
    const isAssignee = task.assigneeId === actorId || (isSubtask && task.parentTask?.assigneeId === actorId);
    const isCollaborator = await this.prisma.taskCollaborator.findUnique({
      where: { taskId_userId: { taskId: id, userId: actorId } },
    });

    if (!isOwnerOrAdmin && !isAssignee && !isCollaborator) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TASK_ACCESS_DENIED',
        message: 'You do not have permission to modify this task.',
      });
    }

    // Role-based operational boundaries
    if (isOwnerOrAdmin) {
      // ADMIN MUST NOT manually update employee task progress
      if (dto.progress !== undefined) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'TASK_PROGRESS_NOT_ALLOWED',
          message: 'Admins cannot manually update employee task progress.',
        });
      }

      // ADMIN MUST NOT start an employee's assigned task
      if (dto.status === TaskStatus.IN_PROGRESS && task.status !== TaskStatus.IN_PROGRESS) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'TASK_START_NOT_ALLOWED',
          message: 'Admins cannot start tasks on behalf of assigned employees. The assigned team member must start their work.',
        });
      }

      // ADMIN MUST NOT submit the task for review on behalf of the employee
      if (dto.status === TaskStatus.IN_REVIEW && task.status !== TaskStatus.IN_REVIEW) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'TASK_REVIEW_SUBMIT_NOT_ALLOWED',
          message: 'Admins cannot submit tasks for review on behalf of employees.',
        });
      }

      // ADMIN MUST NOT mark tasks directly as DONE - completion happens through review approval
      if (dto.status === TaskStatus.DONE && task.status !== TaskStatus.DONE) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'TASK_DIRECT_COMPLETION_NOT_ALLOWED',
          message: 'Tasks cannot be marked as DONE directly. Completion happens through Admin review approval.',
        });
      }
    } else {
      // TEAM_MEMBER operational boundaries:
      // Only the assigned team member can execute actions on their task
      if (!isAssignee) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'TASK_ACCESS_DENIED',
          message: 'Team members can only update tasks assigned to them.',
        });
      }

      const hasPlanningUpdates =
        dto.title !== undefined ||
        dto.description !== undefined ||
        dto.milestoneId !== undefined ||
        dto.assigneeId !== undefined ||
        dto.priority !== undefined ||
        dto.estimatedHours !== undefined ||
        dto.startDate !== undefined ||
        dto.dueDate !== undefined ||
        dto.requiresReview !== undefined ||
        dto.collaboratorIds !== undefined ||
        dto.parentTaskId !== undefined;

      if (hasPlanningUpdates && !isSubtask) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'TASK_PLANNING_IMMUTABLE',
          message: 'Team members cannot modify planning fields or reassign tasks. Contact your Admin.',
        });
      }

      // Progress updates allowed only when task is IN_PROGRESS (subtasks set 0 or 100 on toggle)
      if (dto.progress !== undefined && !isSubtask) {
        if (task.status !== TaskStatus.IN_PROGRESS) {
          throw new ForbiddenException({
            statusCode: 403,
            code: 'TASK_PROGRESS_NOT_ALLOWED',
            message: `Task progress can only be updated while in progress (current status: ${task.status}).`,
          });
        }
      }

      if (dto.status !== undefined && dto.status !== task.status) {
        if (task.status === TaskStatus.WAITING) {
          const unfinishedPredecessors = task.blockedBy.filter(
            (b) => b.predecessorTask.status !== TaskStatus.DONE,
          );

          if (unfinishedPredecessors.length > 0) {
            const names = unfinishedPredecessors.map((b) => b.predecessorTask.humanId).join(', ');
            throw new BadRequestException({
              statusCode: 400,
              code: 'TASK_DEPENDENCY_PENDING',
              message: `This task cannot be changed until its prerequisites are completed (Waiting for: ${names}).`,
            });
          }
        }

        if (dto.status === TaskStatus.DONE && !isSubtask) {
          throw new ForbiddenException({
            statusCode: 403,
            code: 'TASK_DIRECT_COMPLETION_NOT_ALLOWED',
            message: 'Team members cannot mark tasks as DONE. Please submit your work for review.',
          });
        }

        if (
          dto.status === TaskStatus.BACKLOG ||
          dto.status === TaskStatus.PLANNED ||
          dto.status === TaskStatus.TODO ||
          dto.status === TaskStatus.CANCELED
        ) {
          throw new ForbiddenException({
            statusCode: 403,
            code: 'TASK_PLANNING_IMMUTABLE',
            message: 'Team members cannot change task planning status.',
          });
        }

        if (
          dto.status === TaskStatus.IN_PROGRESS &&
          task.status !== TaskStatus.READY &&
          task.status !== TaskStatus.BLOCKED
        ) {
          throw new BadRequestException({
            statusCode: 400,
            code: 'TASK_START_NOT_ALLOWED',
            message: 'Only assigned Ready tasks can be started by team members.',
          });
        }

        if (dto.status === TaskStatus.IN_REVIEW && task.status !== TaskStatus.IN_PROGRESS) {
          throw new BadRequestException({
            statusCode: 400,
            code: 'TASK_NOT_IN_PROGRESS',
            message: 'Only work in progress can be submitted for review.',
          });
        }
      }
    }


    let nextStatus = dto.status !== undefined ? dto.status : (task.status as TaskStatus);
    let nextProgress = dto.progress !== undefined ? dto.progress : task.progress;
    let completedDate = task.completedDate;

    // Automatic readiness reconciliation for assigned tasks:
    const effectiveAssigneeId = dto.assigneeId !== undefined ? dto.assigneeId : task.assigneeId;
    if (
      effectiveAssigneeId &&
      !dto.isManualBlocked &&
      !task.isManualBlocked &&
      nextStatus !== TaskStatus.IN_PROGRESS &&
      nextStatus !== TaskStatus.IN_REVIEW &&
      nextStatus !== TaskStatus.DONE &&
      nextStatus !== TaskStatus.CANCELED &&
      nextStatus !== TaskStatus.BLOCKED
    ) {
      const unfinishedPredecessors = task.blockedBy.filter(
        (b) => b.predecessorTask.status !== TaskStatus.DONE,
      );
      if (unfinishedPredecessors.length > 0) {
        nextStatus = TaskStatus.WAITING;
        nextProgress = 0;
      } else {
        nextStatus = TaskStatus.READY;
        nextProgress = 0;
      }
    } else if (
      !effectiveAssigneeId &&
      (nextStatus === TaskStatus.READY || nextStatus === TaskStatus.WAITING)
    ) {
      nextStatus = TaskStatus.PLANNED;
      nextProgress = 0;
    }

    // Strict validation for transitions & blocked rules
    if (dto.status !== undefined && dto.status !== task.status) {
      // Trying to move to IN_PROGRESS or READY when task has unfinished dependencies
      if (dto.status === TaskStatus.IN_PROGRESS || dto.status === TaskStatus.READY) {
        const unfinishedPredecessors = task.blockedBy.filter(
          (b) => b.predecessorTask.status !== TaskStatus.DONE,
        );

        if (unfinishedPredecessors.length > 0) {
          const names = unfinishedPredecessors.map((b) => b.predecessorTask.humanId).join(', ');
          throw new BadRequestException({
            statusCode: 400,
            code: 'TASK_DEPENDENCY_PENDING',
            message: `This task cannot be started until its prerequisite tasks are completed (Waiting for: ${names}).`,
          });
        }
      }

      // If status changed to DONE
      if (dto.status === TaskStatus.DONE) {
        nextProgress = 100;
        completedDate = new Date();
      } else if (task.status === TaskStatus.DONE) {
        // Reopening task
        completedDate = null;
        if (nextProgress === 100) {
          nextProgress = 50;
        }
      }

      // Backlog, Planned, To Do, Waiting, or Ready resets to 0%
      if (
        dto.status === TaskStatus.BACKLOG ||
        dto.status === TaskStatus.PLANNED ||
        dto.status === TaskStatus.TODO ||
        dto.status === TaskStatus.WAITING ||
        dto.status === TaskStatus.READY
      ) {
        nextProgress = 0;
      }
    }

    // Validate progress cannot contradict status
    if (nextStatus === TaskStatus.DONE && nextProgress < 100) {
      throw new BadRequestException('A completed task must have 100% progress');
    }
    if (
      (nextStatus === TaskStatus.BACKLOG ||
        nextStatus === TaskStatus.PLANNED ||
        nextStatus === TaskStatus.TODO ||
        nextStatus === TaskStatus.WAITING ||
        nextStatus === TaskStatus.READY) &&
      nextProgress > 0
    ) {
      nextProgress = 0;
    }

    // Manual blocker reason requirement
    let isManualBlocked = dto.isManualBlocked !== undefined ? dto.isManualBlocked : task.isManualBlocked;
    let manualBlockReason = dto.manualBlockReason !== undefined ? dto.manualBlockReason : task.manualBlockReason;

    if (dto.isManualBlocked) {
      if (!dto.manualBlockReason || dto.manualBlockReason.trim().length === 0) {
        throw new BadRequestException('A reason is required when manually blocking a task');
      }
      nextStatus = TaskStatus.BLOCKED;
    } else if (dto.isManualBlocked === false && task.isManualBlocked) {
      // Manual block removed
      manualBlockReason = null;
      // Re-evaluate if still dependency waiting
      const unfinished = task.blockedBy.filter((b) => b.predecessorTask.status !== TaskStatus.DONE);
      if (unfinished.length > 0) {
        nextStatus = TaskStatus.WAITING;
      } else if (nextStatus === TaskStatus.BLOCKED) {
        nextStatus = TaskStatus.READY;
      }
    }

    // Update collaborators if provided
    if (dto.collaboratorIds !== undefined) {
      await this.prisma.taskCollaborator.deleteMany({ where: { taskId: id } });
      if (dto.collaboratorIds.length > 0) {
        await this.prisma.taskCollaborator.createMany({
          data: dto.collaboratorIds.map((userId) => ({ taskId: id, userId })),
        });
      }
    }

    // Check reassignment notification
    const isReassigned = dto.assigneeId && dto.assigneeId !== task.assigneeId;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title.trim() : undefined,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        milestoneId: dto.milestoneId !== undefined ? dto.milestoneId : undefined,
        assigneeId: dto.assigneeId !== undefined ? dto.assigneeId : undefined,
        priority: dto.priority !== undefined ? dto.priority : undefined,
        status: nextStatus,
        progress: nextProgress,
        estimatedHours: dto.estimatedHours !== undefined ? dto.estimatedHours : undefined,
        actualHours: dto.actualHours !== undefined ? dto.actualHours : undefined,
        startDate: dto.startDate !== undefined ? (dto.startDate ? new Date(dto.startDate) : null) : undefined,
        dueDate: dto.dueDate !== undefined ? (dto.dueDate ? new Date(dto.dueDate) : null) : undefined,
        completedDate,
        requiresReview: dto.requiresReview !== undefined ? dto.requiresReview : undefined,
        isManualBlocked,
        manualBlockReason,
        parentTaskId: dto.parentTaskId !== undefined ? dto.parentTaskId : undefined,
      },
    });

    // Record activity logs
    const actorUser = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { firstName: true, lastName: true },
    });
    const actorName = actorUser ? `${actorUser.firstName} ${actorUser.lastName}`.trim() : 'User';

    if (dto.status && dto.status !== task.status) {
      let statusDesc = `Changed status from ${task.status} to ${nextStatus}`;
      if (nextStatus === TaskStatus.IN_PROGRESS) {
        statusDesc = `${actorName} started work on ${task.humanId}.`;
      } else if (nextStatus === TaskStatus.IN_REVIEW) {
        statusDesc = `${actorName} submitted ${task.humanId} for review.`;
      }
      await this.recordActivity(
        id,
        task.projectId,
        actorId,
        TaskActionType.STATUS_CHANGED,
        statusDesc,
      );
    }

    if (dto.progress !== undefined && dto.progress !== task.progress) {
      await this.recordActivity(
        id,
        task.projectId,
        actorId,
        TaskActionType.PROGRESS_UPDATED,
        `${actorName} updated progress ${task.progress}% → ${nextProgress}%`,
      );
    }


    if (isReassigned) {
      await this.recordActivity(
        id,
        task.projectId,
        actorId,
        TaskActionType.ASSIGNED,
        `Reassigned task to new team member`,
      );

      if (dto.assigneeId) {
        await this.prisma.notification.create({
          data: {
            userId: dto.assigneeId,
            type: NotificationType.TASK_REASSIGNED,
            title: 'Task Assigned To You',
            message: `You were assigned to "${updated.title}" (${updated.humanId})`,
            linkUrl: `/projects/${task.projectId}?taskId=${task.id}`,
          },
        });
      }
    }

    // DEPENDENCY ENGINE AUTOMATION (Requirement #2, #26, #28)
    // If status changed to DONE or changed away from DONE, cascade update to downstream tasks
    if (dto.status && dto.status !== task.status) {
      await this.handleDependencyAutomation(task.id, nextStatus, actorId);
    }

    // Update project rollups and health
    await this.updateRollups(task.projectId, updated.milestoneId || task.milestoneId);

    return this.findById(id);
  }

  async submitDailyUpdate(
    taskId: string,
    userId: string,
    actorRole: UserRole,
    dto: CreateTaskDailyUpdateDto,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      include: {
        collaborators: true,
        blockedBy: {
          include: { predecessorTask: { select: { humanId: true, status: true } } },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Role check: Only assigned team members can submit daily updates
    if (actorRole !== UserRole.TEAM_MEMBER) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TASK_PROGRESS_NOT_ALLOWED',
        message: 'Admins cannot submit daily progress updates. Daily updates belong only to the assigned team member.',
      });
    }

    if (task.assigneeId !== userId) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TASK_PROGRESS_NOT_ALLOWED',
        message: 'You can only submit daily updates for tasks assigned to you.',
      });
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TASK_PROGRESS_NOT_ALLOWED',
        message: `Daily updates are only allowed when the task is IN_PROGRESS (current status: ${task.status}).`,
      });
    }


    if (dto.progress <= 0 || dto.progress >= 100) {
      throw new BadRequestException('Daily progress for active work must be between 1% and 99%. Submit work for review when it is complete.');
    }

    if (dto.progress < task.progress) {
      throw new BadRequestException({
        code: 'PROGRESS_CANNOT_DECREASE',
        message: `Progress cannot go backward from ${task.progress}% to ${dto.progress}%.`,
      });
    }

    const completedToday = dto.completedToday.trim();
    const nextStep = dto.nextStep.trim();
    const blocker = dto.blocker?.trim() || null;

    if (!completedToday || !nextStep) {
      throw new BadRequestException('Completed work and next planned step are required.');
    }

    if (dto.attachmentId) {
      const attachment = await this.prisma.taskAttachment.findFirst({
        where: {
          id: dto.attachmentId,
          taskId,
          uploaderId: userId,
        },
      });

      if (!attachment) {
        throw new BadRequestException('Attachment does not belong to this task update.');
      }
    }

    const now = new Date();
    const workDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.taskDailyUpdate.findUnique({
        where: {
          taskId_userId_workDate: {
            taskId,
            userId,
            workDate,
          },
        },
      });

      const dailyUpdate = existing
        ? await tx.taskDailyUpdate.update({
            where: { id: existing.id },
            data: {
              progressAfter: dto.progress,
              completedToday,
              blocker,
              nextStep,
              attachmentId: dto.attachmentId || null,
            },
          })
        : await tx.taskDailyUpdate.create({
            data: {
              taskId,
              projectId: task.projectId,
              userId,
              progressBefore: task.progress,
              progressAfter: dto.progress,
              completedToday,
              blocker,
              nextStep,
              attachmentId: dto.attachmentId || null,
              workDate,
            },
          });

      await tx.task.update({
        where: { id: taskId },
        data: {
          progress: dto.progress,
          status: blocker ? TaskStatus.BLOCKED : task.status,
          isManualBlocked: blocker ? true : task.isManualBlocked,
          manualBlockReason: blocker || task.manualBlockReason,
        },
      });

      const author = await tx.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      const authorName = author ? `${author.firstName} ${author.lastName}`.trim() : 'Assignee';

      await tx.taskActivity.create({
        data: {
          taskId,
          projectId: task.projectId,
          userId,
          actionType: TaskActionType.PROGRESS_UPDATED,
          description: `${authorName} updated progress ${task.progress}% → ${dto.progress}%`,
          metadataJson: JSON.stringify({
            progressBefore: existing?.progressBefore ?? task.progress,
            progressAfter: dto.progress,
            hasBlocker: Boolean(blocker),
          }),
        },
      });

      return dailyUpdate;
    });

    await this.updateRollups(task.projectId, task.milestoneId);

    return result;
  }

  /**
   * Dependency Automation:
   * 1. When Task A becomes DONE -> downstream Task B's predecessors are checked.
   *    If all predecessors are now DONE, Task B automatically transitions WAITING -> READY.
   * 2. When Task A is reopened from DONE -> downstream Task B reverts to WAITING if not DONE.
   */
  private async handleDependencyAutomation(
    taskId: string,
    newStatus: TaskStatus,
    actorId: string,
  ) {
    // Find all tasks that depend on this task
    const downstreamDeps = await this.prisma.taskDependency.findMany({
      where: { predecessorTaskId: taskId },
      include: {
        dependentTask: {
          include: {
            blockedBy: {
              include: { predecessorTask: { select: { id: true, status: true, humanId: true } } },
            },
          },
        },
      },
    });

    for (const dep of downstreamDeps) {
      const depTask = dep.dependentTask;
      if (depTask.deletedAt || depTask.status === TaskStatus.DONE || depTask.status === TaskStatus.CANCELED) {
        continue;
      }

      if (newStatus === TaskStatus.DONE) {
        // Check if all predecessors of dependent task are now DONE
        const allPredecessorsDone = depTask.blockedBy.every(
          (b) => b.predecessorTaskId === taskId || b.predecessorTask.status === TaskStatus.DONE,
        );

        if (
          allPredecessorsDone &&
          (depTask.status === TaskStatus.WAITING ||
            depTask.status === TaskStatus.TODO ||
            depTask.status === TaskStatus.PLANNED ||
            (depTask.status === TaskStatus.BLOCKED && !depTask.isManualBlocked))
        ) {
          // Automatically transition to READY if assigned, or PLANNED if unassigned
          const targetStatus = depTask.assigneeId ? TaskStatus.READY : TaskStatus.PLANNED;
          await this.prisma.task.update({
            where: { id: depTask.id },
            data: { status: targetStatus },
          });

          await this.recordActivity(
            depTask.id,
            depTask.projectId,
            actorId,
            TaskActionType.AUTOMATICALLY_UNBLOCKED,
            `Prerequisites completed. Task automatically became READY to start.`,
          );

          if (depTask.assigneeId) {
            await this.prisma.notification.create({
              data: {
                userId: depTask.assigneeId,
                type: NotificationType.TASK_READY,
                title: 'Your task is ready to start',
                message: `"${depTask.title}" (${depTask.humanId}) is now ready to start. All prerequisite tasks are completed.`,
                linkUrl: `/projects/${depTask.projectId}?taskId=${depTask.id}`,
              },
            });
          }
        }
      } else {
        // Predecessor was uncompleted/reopened -> revert dependent task to WAITING (unless manual blocked)
        if (
          (depTask.status === TaskStatus.READY || depTask.status === TaskStatus.IN_PROGRESS) &&
          !depTask.isManualBlocked
        ) {
          await this.prisma.task.update({
            where: { id: depTask.id },
            data: { status: TaskStatus.WAITING, progress: 0 },
          });

          await this.recordActivity(
            depTask.id,
            depTask.projectId,
            actorId,
            TaskActionType.AUTOMATICALLY_BLOCKED,
            `Prerequisite task reopened. Task automatically returned to WAITING state.`,
          );

          if (depTask.assigneeId) {
            await this.prisma.notification.create({
              data: {
                userId: depTask.assigneeId,
                type: NotificationType.TASK_BLOCKED,
                title: 'Task Waiting on Prerequisites',
                message: `"${depTask.title}" (${depTask.humanId}) returned to WAITING because a prerequisite task was reopened.`,
                linkUrl: `/projects/${depTask.projectId}?taskId=${depTask.id}`,
              },
            });
          }
        }
      }
    }
  }

  async review(
    id: string,
    reviewerId: string,
    reviewerRole: UserRole,
    dto: ReviewTaskDto,
  ) {
    if (reviewerRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Only Admins can review and approve tasks.');
    }

    if (dto.status === ReviewStatus.REJECTED && !dto.feedback?.trim()) {
      throw new BadRequestException('Rejection feedback is required when requesting changes.');
    }

    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: { project: true },
    });

    if (!task) throw new NotFoundException('Task not found');

    if (task.status !== TaskStatus.IN_REVIEW) {
      throw new BadRequestException('Task is not currently awaiting review');
    }

    // Save review record
    await this.prisma.taskReview.create({
      data: {
        taskId: id,
        reviewerId,
        status: dto.status,
        feedback: dto.feedback?.trim(),
      },
    });

    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
      select: { firstName: true, lastName: true },
    });
    const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}`.trim() : 'Admin';

    if (dto.status === ReviewStatus.APPROVED) {
      await this.prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.DONE,
          progress: 100,
          completedDate: new Date(),
        },
      });

      await this.recordActivity(
        id,
        task.projectId,
        reviewerId,
        TaskActionType.REVIEW_APPROVED,
        `${reviewerName} approved ${task.humanId}.`,
      );

      if (task.assigneeId && task.assigneeId !== reviewerId) {
        await this.prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: NotificationType.REVIEW_APPROVED,
            title: 'Work Approved',
            message: `Your work on "${task.title}" (${task.humanId}) was approved.`,
            linkUrl: `/projects/${task.projectId}?taskId=${task.id}`,
          },
        });
      }

      await this.handleDependencyAutomation(task.id, TaskStatus.DONE, reviewerId);
    } else {
      // REJECTED
      await this.prisma.task.update({
        where: { id },
        data: {
          status: TaskStatus.IN_PROGRESS,
        },
      });

      await this.recordActivity(
        id,
        task.projectId,
        reviewerId,
        TaskActionType.REVIEW_REJECTED,
        `${reviewerName} returned ${task.humanId} for changes: ${dto.feedback || 'Changes requested'}`,
      );

      if (task.assigneeId && task.assigneeId !== reviewerId) {
        await this.prisma.notification.create({
          data: {
            userId: task.assigneeId,
            type: NotificationType.REVIEW_REJECTED,
            title: 'Changes Requested on Task',
            message: `Reviewer requested changes on "${task.title}" (${task.humanId}): "${dto.feedback || 'Please update work'}"`,
            linkUrl: `/projects/${task.projectId}?taskId=${task.id}`,
          },
        });
      }
    }

    await this.updateRollups(task.projectId, task.milestoneId);

    return this.findById(id);
  }

  async delete(id: string, actorId: string, actorRole?: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members cannot delete tasks.');
    }

    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });


    await this.updateRollups(task.projectId, task.milestoneId);

    return { success: true, message: 'Task archived/deleted' };
  }

  private async updateRollups(projectId: string, milestoneId?: string | null) {
    try {
      // Calculate weighted project progress
      const tasks = await this.prisma.task.findMany({
        where: { projectId, deletedAt: null, status: { notIn: [TaskStatus.CANCELED] } },
        select: { progress: true, estimatedHours: true, status: true },
      });

      if (tasks.length > 0) {
        const totalEst = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
        let progress = 0;
        if (totalEst > 0) {
          const weightedSum = tasks.reduce(
            (sum, t) => sum + (t.estimatedHours || 0) * (t.progress / 100),
            0,
          );
          progress = Math.round((weightedSum / totalEst) * 100);
        } else {
          const totalProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
          progress = Math.round(totalProgress / tasks.length);
        }

        await this.prisma.project.update({
          where: { id: projectId },
          data: { progress },
        });
      }

      // Update milestone if present
      if (milestoneId) {
        const mTasks = await this.prisma.task.findMany({
          where: { milestoneId, deletedAt: null, status: { notIn: [TaskStatus.CANCELED] } },
          select: { status: true },
        });

        if (mTasks.length > 0) {
          const doneMCount = mTasks.filter((t) => t.status === TaskStatus.DONE).length;
          const mProgress = Math.round((doneMCount / mTasks.length) * 100);
          await this.prisma.milestone.update({
            where: { id: milestoneId },
            data: { progress: mProgress },
          });
        }
      }
    } catch (e) {
      this.logger.warn(`Failed to update rollups: ${e}`);
    }
  }

  private async recordActivity(
    taskId: string,
    projectId: string,
    userId: string,
    actionType: TaskActionType,
    description: string,
  ) {
    try {
      await this.prisma.taskActivity.create({
        data: {
          taskId,
          projectId,
          userId,
          actionType,
          description,
        },
      });
    } catch (e) {
      // ignore
    }
  }

  private mapTaskToDto(t: any) {
    const subtasks = t.subtasks || [];
    const completedSubtasks = subtasks.filter((s: any) => s.status === TaskStatus.DONE).length;

    const latestReview = t.reviews && t.reviews.length > 0 ? t.reviews[0] : null;

    return {
      id: t.id,
      taskNumber: t.taskNumber,
      humanId: t.humanId,
      title: t.title,
      description: t.description,
      projectId: t.projectId,
      project: t.project,
      milestoneId: t.milestoneId,
      milestone: t.milestone,
      creatorId: t.creatorId,
      creator: t.creator,
      assigneeId: t.assigneeId,
      assignee: t.assignee,
      collaborators: (t.collaborators || []).map((c: any) => c.user || c),
      priority: t.priority as TaskPriority,
      status: t.status as TaskStatus,
      progress: t.progress,
      estimatedHours: t.estimatedHours,
      actualHours: t.actualHours,
      startDate: t.startDate ? t.startDate.toISOString() : null,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      completedDate: t.completedDate ? t.completedDate.toISOString() : null,
      requiresReview: t.requiresReview,
      reviewStatus: latestReview ? (latestReview.status as ReviewStatus) : null,
      reviewFeedback: latestReview ? latestReview.feedback : null,
      isManualBlocked: t.isManualBlocked,
      manualBlockReason: t.manualBlockReason,
      parentTaskId: t.parentTaskId,
      parentTask: t.parentTask,
      subtasks: t.subtasks,
      subtasksCount: subtasks.length,
      completedSubtasksCount: completedSubtasks,
      blockedBy: (t.blockedBy || []).map((b: any) => ({
        id: b.id,
        predecessorTaskId: b.predecessorTaskId,
        dependentTaskId: b.dependentTaskId,
        predecessorTask: b.predecessorTask,
        createdAt: b.createdAt ? b.createdAt.toISOString() : new Date().toISOString(),
      })),
      blocking: (t.blocking || []).map((b: any) => ({
        id: b.id,
        predecessorTaskId: b.predecessorTaskId,
        dependentTaskId: b.dependentTaskId,
        dependentTask: b.dependentTask,
        createdAt: b.createdAt ? b.createdAt.toISOString() : new Date().toISOString(),
      })),
      dailyUpdates: (t.dailyUpdates || []).map((u: any) => ({
        id: u.id,
        taskId: u.taskId,
        projectId: u.projectId,
        userId: u.userId,
        user: u.user,
        progressBefore: u.progressBefore,
        progressAfter: u.progressAfter,
        completedToday: u.completedToday,
        blocker: u.blocker,
        nextStep: u.nextStep,
        attachmentId: u.attachmentId,
        attachment: u.attachment,
        workDate: u.workDate.toISOString(),
        createdAt: u.createdAt.toISOString(),
      })),
      commentsCount: t.comments ? t.comments.length : (t._count?.comments || 0),
      attachmentsCount: t.attachments ? t.attachments.length : (t._count?.attachments || 0),
      comments: (t.comments || []).map((c: any) => ({
        id: c.id,
        taskId: c.taskId,
        authorId: c.authorId,
        author: c.author,
        content: c.content,
        isEdited: c.isEdited,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      attachments: (t.attachments || []).map((a: any) => ({
        id: a.id,
        taskId: a.taskId,
        projectId: a.projectId,
        uploaderId: a.uploaderId,
        uploader: a.uploader,
        fileName: a.fileName,
        fileKey: a.fileKey,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        createdAt: a.createdAt.toISOString(),
      })),
      activities: (t.activities || []).map((act: any) => ({
        id: act.id,
        taskId: act.taskId,
        projectId: act.projectId,
        userId: act.userId,
        user: act.user,
        actionType: act.actionType as TaskActionType,
        description: act.description,
        createdAt: act.createdAt.toISOString(),
      })),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
