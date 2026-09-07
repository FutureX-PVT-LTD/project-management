import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  PostProjectUpdateDto,
} from './dto/create-project.dto';
import {
  UserRole,
  ProjectStatus,
  ProjectHealth,
  ProjectMemberRole,
  TaskStatus,
  TaskPriority,
  AuditAction,
  NotificationType,
} from '@futurex/shared';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: { id: string; globalRole: UserRole }, statusFilter?: string) {
    const where: any = { deletedAt: null };

    if (statusFilter && statusFilter !== 'ALL') {
      where.status = statusFilter;
    }

    // Role-based visibility: OWNER and ADMIN see all workspace projects
    // TEAM_MEMBER sees ONLY projects where they are an assigned member
    if (user.globalRole === UserRole.TEAM_MEMBER) {
      where.members = {
        some: { userId: user.id },
      };
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                jobTitle: true,
                globalRole: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { orderIndex: 'asc' },
        },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            status: true,
            dueDate: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
    });


    return projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === 'DONE').length;
      const blockedTasks = p.tasks.filter((t) => t.status === 'BLOCKED').length;
      const now = new Date();
      const overdueTasks = p.tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELED',
      ).length;

      // Find current milestone
      const currentMilestone = p.milestones.find((m) => m.status !== 'COMPLETED') || p.milestones[0];
      const visibleMembers = p.members.filter(
        (m) => m.userId !== p.projectManagerId && m.user?.globalRole === UserRole.TEAM_MEMBER,
      );

      return {
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        status: p.status as ProjectStatus,
        health: p.health as ProjectHealth,
        healthReason: p.healthReason,
        manualHealthOverride: p.manualHealthOverride,
        progress: p.progress,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        targetDate: p.targetDate ? p.targetDate.toISOString() : null,
        completedDate: p.completedDate ? p.completedDate.toISOString() : null,
        projectManagerId: p.projectManagerId,
        projectManager: p.projectManager,
        membersCount: visibleMembers.length,
        members: visibleMembers.map((m) => ({
          id: m.id,
          userId: m.userId,
          role: m.role as ProjectMemberRole,
          user: m.user,
        })),
        totalTasksCount: totalTasks,
        completedTasksCount: completedTasks,
        blockedTasksCount: blockedTasks,
        overdueTasksCount: overdueTasks,
        currentMilestoneName: currentMilestone?.name,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  async findById(id: string, user: { id: string; globalRole: UserRole }) {
    const project = await this.prisma.project.findUnique({
      where: { id, deletedAt: null },
      include: {
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                jobTitle: true,
                globalRole: true,
              },
            },
          },
        },
        milestones: {
          orderBy: { orderIndex: 'asc' },
          include: {
            tasks: {
              where: { deletedAt: null },
              select: { id: true, status: true },
            },
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
        dailyUpdates: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            task: {
              select: { id: true, humanId: true, title: true, status: true, progress: true },
            },
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true },
            },
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            humanId: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            estimatedHours: true,
            progress: true,
            assigneeId: true,
            milestoneId: true,
            createdAt: true,
            updatedAt: true,
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                jobTitle: true,
                globalRole: true,
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
                  },
                },
              },
            },
          },
          orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Role check
    if (user.globalRole !== UserRole.OWNER && user.globalRole !== UserRole.ADMIN) {
      const isManager = project.projectManagerId === user.id;
      const isMember = project.members.some((m) => m.userId === user.id);
      if (!isManager && !isMember) {
        throw new ForbiddenException('You do not have access to this project');
      }
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length;
    const blockedTasks = project.tasks.filter((t) => t.status === 'BLOCKED').length;
    const now = new Date();
    const overdueTasks = project.tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELED',
    ).length;
    const visibleMembers = project.members.filter(
      (m) => m.userId !== project.projectManagerId && m.user?.globalRole === UserRole.TEAM_MEMBER,
    );

    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      status: project.status as ProjectStatus,
      health: project.health as ProjectHealth,
      healthReason: project.healthReason,
      manualHealthOverride: project.manualHealthOverride,
      progress: project.progress,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      targetDate: project.targetDate ? project.targetDate.toISOString() : null,
      completedDate: project.completedDate ? project.completedDate.toISOString() : null,
      projectManagerId: project.projectManagerId,
      projectManager: project.projectManager,
      members: visibleMembers.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role as ProjectMemberRole,
        joinedAt: m.joinedAt.toISOString(),
        user: m.user,
      })),
      milestones: project.milestones.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        name: m.name,
        description: m.description,
        targetDate: m.targetDate.toISOString(),
        status: m.status,
        progress: m.progress,
        orderIndex: m.orderIndex,
        tasksCount: m.tasks.length,
        completedTasksCount: m.tasks.filter((t) => t.status === 'DONE').length,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      })),
      updates: project.updates.map((u) => ({
        id: u.id,
        projectId: u.projectId,
        health: u.health as ProjectHealth,
        note: u.note,
        createdAt: u.createdAt.toISOString(),
        author: u.author,
      })),
      latestDailyUpdates: project.dailyUpdates.map((u) => ({
        id: u.id,
        taskId: u.taskId,
        projectId: u.projectId,
        userId: u.userId,
        task: u.task,
        user: u.user,
        progressBefore: u.progressBefore,
        progressAfter: u.progressAfter,
        completedToday: u.completedToday,
        blocker: u.blocker,
        nextStep: u.nextStep,
        workDate: u.workDate.toISOString(),
        createdAt: u.createdAt.toISOString(),
      })),
      tasks: project.tasks.map((t) => ({
        id: t.id,
        humanId: t.humanId,
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        priority: t.priority as TaskPriority,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        estimatedHours: t.estimatedHours,
        progress: t.progress,
        assigneeId: t.assigneeId,
        milestoneId: t.milestoneId,
        assignee: t.assignee,
        blockedBy: t.blockedBy.map((b) => ({
          id: b.id,
          predecessorTaskId: b.predecessorTaskId,
          predecessorTask: b.predecessorTask,
        })),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      totalTasksCount: totalTasks,
      completedTasksCount: completedTasks,
      blockedTasksCount: blockedTasks,
      overdueTasksCount: overdueTasks,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateProjectDto, actorId: string, actorRole?: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members are not permitted to create projects.');
    }

    const cleanKey = dto.key.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z0-9]{2,6}$/.test(cleanKey)) {
      throw new BadRequestException('Project key must be 2-6 letters or numbers.');
    }

    const existing = await this.prisma.project.findUnique({
      where: { key: cleanKey },
    });

    if (existing) {
      throw new BadRequestException(`Project key "${cleanKey}" is already in use`);
    }

    // Authenticated Admin/Owner is automatically the managing Admin
    const projectManagerId = actorId;

    // Filter and validate assigned team members (strictly active TEAM_MEMBER users)
    const rawMemberIds = (dto.memberIds || [])
      .map((m: any) => (typeof m === 'string' ? m : m.userId))
      .filter((uid: string) => Boolean(uid) && uid !== actorId);

    const eligibleMembers = rawMemberIds.length > 0
      ? await this.prisma.user.findMany({
          where: {
            id: { in: rawMemberIds },
            globalRole: UserRole.TEAM_MEMBER,
            isActive: true,
            deletedAt: null,
          },
          select: { id: true },
        })
      : [];

    const project = await this.prisma.project.create({
      data: {
        key: cleanKey,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        status: dto.status || ProjectStatus.ACTIVE,
        health: dto.health || ProjectHealth.ON_TRACK,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        projectManagerId,
        members: {
          create: eligibleMembers.map((m) => ({
            userId: m.id,
            role: ProjectMemberRole.MEMBER,
          })),
        },
      },
    });

    // Notify assigned members
    for (const member of eligibleMembers) {
      await this.prisma.notification.create({
        data: {
          userId: member.id,
          type: NotificationType.PROJECT_MEMBER_ADDED,
          title: 'Assigned to Project',
          message: `You were added to project ${project.name} (${project.key})`,
          linkUrl: `/projects/${project.id}`,
        },
      });
    }

    await this.recordAudit(actorId, AuditAction.PROJECT_CREATED, 'Project', project.id, {
      key: project.key,
      name: project.name,
    });

    return this.findById(project.id, { id: actorId, globalRole: UserRole.OWNER });
  }

  async update(id: string, dto: UpdateProjectDto, actorId: string, actorRole?: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members cannot modify project settings.');
    }

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const updated = await this.prisma.project.update({

      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        status: dto.status,
        health: dto.health,
        healthReason: dto.healthReason,
        manualHealthOverride: dto.manualHealthOverride,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });

    await this.recordAudit(actorId, AuditAction.PROJECT_UPDATED, 'Project', id, dto);

    return this.findById(updated.id, { id: actorId, globalRole: UserRole.OWNER });
  }

  /**
   * Calculates weighted project progress according to Requirement #36:
   * (Sum of (estimatedHours * progress / 100)) / Total estimatedHours * 100
   * If estimates do not exist, fallbacks to completed task count ratio.
   */
  async calculateProjectProgress(projectId: string): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null, status: { notIn: ['CANCELED'] } },
      select: {
        status: true,
        progress: true,
        estimatedHours: true,
      },
    });

    if (tasks.length === 0) {
      return 0;
    }

    const totalEstimated = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

    let progress = 0;
    if (totalEstimated > 0) {
      const weightedProgressSum = tasks.reduce((sum, t) => {
        const weight = t.estimatedHours || 0;
        return sum + weight * (t.progress / 100);
      }, 0);
      progress = Math.round((weightedProgressSum / totalEstimated) * 100);
    } else {
      const completedCount = tasks.filter((t) => t.status === 'DONE').length;
      progress = Math.round((completedCount / tasks.length) * 100);
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });

    return progress;
  }

  /**
   * Automatically evaluates project health according to Requirement #37.
   */
  async evaluateProjectHealth(projectId: string): Promise<{ health: ProjectHealth; reason: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: { status: true, dueDate: true },
        },
      },
    });

    if (!project) return { health: ProjectHealth.ON_TRACK, reason: 'Project initialized' };

    const total = project.tasks.length;
    const blocked = project.tasks.filter((t) => t.status === 'BLOCKED').length;
    const now = new Date();
    const overdue = project.tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE' && t.status !== 'CANCELED',
    ).length;

    let health = ProjectHealth.ON_TRACK;
    let reason = 'Deliverables on schedule';

    if (blocked > 0 || overdue > 0) {
      if (blocked >= 3 || overdue >= 3 || (total > 0 && (blocked + overdue) / total > 0.3)) {
        health = ProjectHealth.OFF_TRACK;
        reason = `${blocked} blocked tasks and ${overdue} overdue deliverables`;
      } else {
        health = ProjectHealth.AT_RISK;
        reason = `${blocked > 0 ? `${blocked} task blocked` : ''} ${overdue > 0 ? `${overdue} overdue deliverable` : ''}`.trim();
      }
    }

    if (!project.manualHealthOverride) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { health, healthReason: reason },
      });
    }

    return { health, reason };
  }

  async addMember(
    projectId: string,
    userId: string,
    role: ProjectMemberRole,
    actorId: string,
    actorRole?: UserRole,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members cannot manage project members.');
    }

    // Verify target user is an active TEAM_MEMBER
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException('Target user is not an active user');
    }
    if (targetUser.globalRole !== UserRole.TEAM_MEMBER) {
      throw new BadRequestException('Only TEAM_MEMBER users can be assigned as project members');
    }

    const member = await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role: ProjectMemberRole.MEMBER },
      update: { role: ProjectMemberRole.MEMBER },
      include: { user: true },
    });

    await this.prisma.notification.create({
      data: {
        userId,
        type: NotificationType.PROJECT_MEMBER_ADDED,
        title: 'Added to Project',
        message: `You were added to project ${project.name} (${project.key})`,
        linkUrl: `/projects/${projectId}`,
      },
    });

    await this.recordAudit(actorId, AuditAction.PROJECT_MEMBER_ADDED, 'ProjectMember', member.id, {
      projectId,
      userId,
      role: ProjectMemberRole.MEMBER,
    });

    return member;
  }

  async removeMember(
    projectId: string,
    userId: string,
    actorId: string,
    actorRole?: UserRole,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members cannot manage project members.');
    }

    await this.prisma.projectMember.deleteMany({
      where: { projectId, userId },
    });

    await this.recordAudit(actorId, AuditAction.PROJECT_MEMBER_REMOVED, 'ProjectMember', projectId, {
      userId,
    });

    return { success: true, message: 'Member removed from project' };
  }

  async postUpdate(
    projectId: string,
    authorId: string,
    dto: PostProjectUpdateDto,
    actorRole?: UserRole,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException('Team members cannot post project status updates.');
    }

    const update = await this.prisma.projectUpdate.create({

      data: {
        projectId,
        authorId,
        health: dto.health,
        note: dto.note.trim(),
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Also update project health
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        health: dto.health,
        healthReason: dto.note.trim(),
        manualHealthOverride: true,
      },
    });

    return update;
  }

  private async recordAudit(
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          entityType,
          entityId,
          detailsJson: details ? JSON.stringify(details) : undefined,
        },
      });
    } catch (e) {
      // ignore
    }
  }
}
