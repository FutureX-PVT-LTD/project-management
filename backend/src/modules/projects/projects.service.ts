import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateProjectDto,
  UpdateProjectDto,
  PostProjectUpdateDto,
  GenerateDevelopmentChecklistDto,
  AssignChecklistItemDto,
  BulkResponsibilityAssignmentDto,
} from "./dto/create-project.dto";
import {
  UserRole,
  ProjectStatus,
  ProjectHealth,
  ProjectMemberRole,
  ProductType,
  TaskStatus,
  TaskPriority,
  AuditAction,
  NotificationType,
  TaskActionType,
} from "@futurex/shared";
import { IdGeneratorUtil } from "../../common/utils/id-generator.util";

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    user: { id: string; globalRole: UserRole },
    statusFilter?: string,
  ) {
    const where: any = { deletedAt: null };

    if (statusFilter && statusFilter !== "ALL") {
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
          orderBy: { orderIndex: "asc" },
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
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return projects.map((p) => {
      const totalTasks = p.tasks.length;
      const completedTasks = p.tasks.filter((t) => t.status === "DONE").length;
      const blockedTasks = p.tasks.filter((t) => t.status === "BLOCKED").length;
      const now = new Date();
      const overdueTasks = p.tasks.filter(
        (t) =>
          t.dueDate &&
          new Date(t.dueDate) < now &&
          t.status !== "DONE" &&
          t.status !== "CANCELED",
      ).length;

      // Find current milestone
      const currentMilestone =
        p.milestones.find((m) => m.status !== "COMPLETED") || p.milestones[0];
      const visibleMembers = p.members.filter(
        (m) =>
          m.userId !== p.projectManagerId &&
          m.user?.globalRole === UserRole.TEAM_MEMBER,
      );

      return {
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        productType: (p as any).productType as ProductType,
        status: p.status as ProjectStatus,
        health: p.health as ProjectHealth,
        healthReason: p.healthReason,
        manualHealthOverride: p.manualHealthOverride,
        progress: p.progress,
        launchReadiness: (p as any).launchReadiness,
        currentPhase: (p as any).currentPhase,
        checklistGeneratedAt: (p as any).checklistGeneratedAt
          ? (p as any).checklistGeneratedAt.toISOString()
          : null,
        checklistTemplateVersion: (p as any).checklistTemplateVersion,
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
          orderBy: { orderIndex: "asc" },
          include: {
            tasks: {
              where: { deletedAt: null },
              select: { id: true, status: true },
            },
          },
        },
        updates: {
          orderBy: { createdAt: "desc" },
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
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            task: {
              select: {
                id: true,
                humanId: true,
                title: true,
                status: true,
                progress: true,
              },
            },
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
        tasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            humanId: true,
            title: true,
            description: true,
            workType: true,
            checklistTemplateItemId: true,
            checklistCode: true,
            checklistPhase: true,
            checklistStage: true,
            checklistOwnerRole: true,
            checklistDoneWhen: true,
            checklistMandatory: true,
            checklistOrder: true,
            allowParallelWork: true,
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
          orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    // Role check
    if (
      user.globalRole !== UserRole.OWNER &&
      user.globalRole !== UserRole.ADMIN
    ) {
      const isManager = project.projectManagerId === user.id;
      const isMember = project.members.some((m) => m.userId === user.id);
      if (!isManager && !isMember) {
        throw new ForbiddenException("You do not have access to this project");
      }
    }

    const activeProjectTasks = project.tasks.filter(
      (t) => t.status !== TaskStatus.N_A && t.status !== TaskStatus.CANCELED,
    );
    const totalTasks = activeProjectTasks.length;
    const completedTasks = activeProjectTasks.filter(
      (t) => t.status === "DONE",
    ).length;
    const blockedTasks = project.tasks.filter(
      (t) => t.status === "BLOCKED",
    ).length;
    const now = new Date();
    const overdueTasks = activeProjectTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "DONE" &&
        t.status !== "CANCELED",
    ).length;
    const visibleMembers = project.members.filter(
      (m) =>
        m.userId !== project.projectManagerId &&
        m.user?.globalRole === UserRole.TEAM_MEMBER,
    );
    const checklistSummary = this.calculateChecklistSummary(project.tasks);
    const phaseProgress = this.calculatePhaseProgress(project.tasks);

    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      productType: (project as any).productType as ProductType,
      status: project.status as ProjectStatus,
      health: project.health as ProjectHealth,
      healthReason: project.healthReason,
      manualHealthOverride: project.manualHealthOverride,
      progress: project.progress,
      launchReadiness: (project as any).launchReadiness,
      currentPhase: (project as any).currentPhase,
      checklistGeneratedAt: (project as any).checklistGeneratedAt
        ? (project as any).checklistGeneratedAt.toISOString()
        : null,
      checklistTemplateVersion: (project as any).checklistTemplateVersion,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      targetDate: project.targetDate ? project.targetDate.toISOString() : null,
      completedDate: project.completedDate
        ? project.completedDate.toISOString()
        : null,
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
        completedTasksCount: m.tasks.filter((t) => t.status === "DONE").length,
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
        workType: (t as any).workType,
        checklistTemplateItemId: (t as any).checklistTemplateItemId,
        checklistCode: (t as any).checklistCode,
        checklistPhase: (t as any).checklistPhase,
        checklistStage: (t as any).checklistStage,
        checklistOwnerRole: (t as any).checklistOwnerRole,
        checklistDoneWhen: (t as any).checklistDoneWhen,
        checklistMandatory: (t as any).checklistMandatory,
        checklistOrder: (t as any).checklistOrder,
        allowParallelWork: (t as any).allowParallelWork,
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
      checklistSummary,
      phaseProgress,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async create(dto: CreateProjectDto, actorId: string, actorRole?: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException(
        "Team members are not permitted to create projects.",
      );
    }

    const requestedKey = dto.key
      ?.toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]/g, "");
    let cleanKey = requestedKey || "";
    if (requestedKey) {
      if (!/^[A-Z0-9]{2,6}$/.test(requestedKey)) {
        throw new BadRequestException(
          "Project key must be 2-6 letters or numbers.",
        );
      }

      const existing = await this.prisma.project.findUnique({
        where: { key: requestedKey },
      });

      if (existing) {
        throw new BadRequestException(
          `Project key "${requestedKey}" is already in use`,
        );
      }
    } else {
      cleanKey = await this.generateUniqueProjectKey(dto.name, dto.productType);
    }

    // Authenticated Admin/Owner is automatically the managing Admin
    const projectManagerId = actorId;

    // Filter and validate assigned team members (strictly active TEAM_MEMBER users)
    const rawMemberIds = (dto.memberIds || [])
      .map((m: any) => (typeof m === "string" ? m : m.userId))
      .filter((uid: string) => Boolean(uid) && uid !== actorId);

    const eligibleMembers =
      rawMemberIds.length > 0
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
        productType: dto.productType || ProductType.GAME,
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
          title: "Assigned to Project",
          message: `You were added to project ${project.name} (${project.key})`,
          linkUrl: `/projects/${project.id}`,
        },
      });
    }

    await this.recordAudit(
      actorId,
      AuditAction.PROJECT_CREATED,
      "Project",
      project.id,
      {
        key: project.key,
        name: project.name,
      },
    );

    return this.findById(project.id, {
      id: actorId,
      globalRole: UserRole.OWNER,
    });
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    actorId: string,
    actorRole?: UserRole,
  ) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException(
        "Team members cannot modify project settings.",
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { members: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        productType: dto.productType,
        status: dto.status,
        health: dto.health,
        healthReason: dto.healthReason,
        manualHealthOverride: dto.manualHealthOverride,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });

    await this.recordAudit(
      actorId,
      AuditAction.PROJECT_UPDATED,
      "Project",
      id,
      dto,
    );

    return this.findById(updated.id, {
      id: actorId,
      globalRole: UserRole.OWNER,
    });
  }

  /**
   * Calculates weighted project progress according to Requirement #36:
   * (Sum of (estimatedHours * progress / 100)) / Total estimatedHours * 100
   * If estimates do not exist, fallbacks to completed task count ratio.
   */
  async calculateProjectProgress(projectId: string): Promise<number> {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null, status: { notIn: ["CANCELED"] } },
      select: {
        status: true,
        progress: true,
        estimatedHours: true,
      },
    });

    if (tasks.length === 0) {
      return 0;
    }

    const totalEstimated = tasks.reduce(
      (sum, t) => sum + (t.estimatedHours || 0),
      0,
    );

    let progress = 0;
    if (totalEstimated > 0) {
      const weightedProgressSum = tasks.reduce((sum, t) => {
        const weight = t.estimatedHours || 0;
        return sum + weight * (t.progress / 100);
      }, 0);
      progress = Math.round((weightedProgressSum / totalEstimated) * 100);
    } else {
      const completedCount = tasks.filter((t) => t.status === "DONE").length;
      progress = Math.round((completedCount / tasks.length) * 100);
    }

    await this.prisma.project.update({
      where: { id: projectId },
      data: { progress },
    });

    return progress;
  }

  async delete(id: string, actorId: string, actorRole?: UserRole) {
    if (actorRole !== UserRole.OWNER) {
      throw new ForbiddenException(
        "Only the Super Admin can delete projects.",
      );
    }

    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        key: true,
        name: true,
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.task.updateMany({
        where: { projectId: id, deletedAt: null },
        data: {
          deletedAt: now,
          status: TaskStatus.CANCELED,
        },
      }),
      this.prisma.project.update({
        where: { id },
        data: {
          deletedAt: now,
          status: ProjectStatus.ARCHIVED,
        },
      }),
    ]);

    await this.recordAudit(
      actorId,
      AuditAction.PROJECT_DELETED,
      "Project",
      id,
      {
        projectKey: project.key,
        projectName: project.name,
        taskCount: project._count.tasks,
        memberCount: project._count.members,
      },
    );

    return {
      success: true,
      message: "Project deleted successfully.",
      id,
    };
  }

  /**
   * Automatically evaluates project health according to Requirement #37.
   */
  async evaluateProjectHealth(
    projectId: string,
  ): Promise<{ health: ProjectHealth; reason: string }> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: { status: true, dueDate: true },
        },
      },
    });

    if (!project)
      return { health: ProjectHealth.ON_TRACK, reason: "Project initialized" };

    const total = project.tasks.length;
    const blocked = project.tasks.filter((t) => t.status === "BLOCKED").length;
    const now = new Date();
    const overdue = project.tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "DONE" &&
        t.status !== "CANCELED",
    ).length;

    let health = ProjectHealth.ON_TRACK;
    let reason = "Deliverables on schedule";

    if (blocked > 0 || overdue > 0) {
      if (
        blocked >= 3 ||
        overdue >= 3 ||
        (total > 0 && (blocked + overdue) / total > 0.3)
      ) {
        health = ProjectHealth.OFF_TRACK;
        reason = `${blocked} blocked tasks and ${overdue} overdue deliverables`;
      } else {
        health = ProjectHealth.AT_RISK;
        reason =
          `${blocked > 0 ? `${blocked} task blocked` : ""} ${overdue > 0 ? `${overdue} overdue deliverable` : ""}`.trim();
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
    if (!project) throw new NotFoundException("Project not found");

    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException(
        "Team members cannot manage project members.",
      );
    }

    // Verify target user is an active TEAM_MEMBER
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException("Target user is not an active user");
    }
    if (targetUser.globalRole !== UserRole.TEAM_MEMBER) {
      throw new BadRequestException(
        "Only TEAM_MEMBER users can be assigned as project members",
      );
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
        title: "Added to Project",
        message: `You were added to project ${project.name} (${project.key})`,
        linkUrl: `/projects/${projectId}`,
      },
    });

    await this.recordAudit(
      actorId,
      AuditAction.PROJECT_MEMBER_ADDED,
      "ProjectMember",
      member.id,
      {
        projectId,
        userId,
        role: ProjectMemberRole.MEMBER,
      },
    );

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
    if (!project) throw new NotFoundException("Project not found");

    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException(
        "Team members cannot manage project members.",
      );
    }

    await this.prisma.projectMember.deleteMany({
      where: { projectId, userId },
    });

    await this.recordAudit(
      actorId,
      AuditAction.PROJECT_MEMBER_REMOVED,
      "ProjectMember",
      projectId,
      {
        userId,
      },
    );

    return { success: true, message: "Member removed from project" };
  }

  async getDevelopmentTemplate(productType?: ProductType | string) {
    const type = productType || ProductType.GAME;
    return this.prisma.checklistTemplateItem.findMany({
      where: {
        isActive: true,
        applicableTypes: { has: type },
      },
      orderBy: { defaultOrder: "asc" },
    });
  }

  async generateDevelopmentChecklist(
    projectId: string,
    actorId: string,
    actorRole: UserRole,
    dto: GenerateDevelopmentChecklistDto,
  ) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException(
        "Team members cannot generate product development checklists.",
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
      include: {
        tasks: { where: { deletedAt: null, workType: "STANDARD_CHECKLIST" } },
      },
    });
    if (!project) throw new NotFoundException("Product not found");

    if ((project as any).checklistGeneratedAt || project.tasks.length > 0) {
      throw new BadRequestException(
        "Development checklist has already been generated for this product.",
      );
    }

    const templateItems = await this.getDevelopmentTemplate(
      (project as any).productType,
    );
    if (templateItems.length === 0) {
      throw new BadRequestException(
        "No active development checklist template items are available for this product type.",
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const lastTask = await tx.task.findFirst({
        where: { projectId },
        orderBy: { taskNumber: "desc" },
        select: { taskNumber: true },
      });

      let nextTaskNumber = lastTask?.taskNumber || 100;
      const createdTasks: any[] = [];

      for (const item of templateItems) {
        nextTaskNumber += 1;
        const created = await tx.task.create({
          data: {
            taskNumber: nextTaskNumber,
            humanId: IdGeneratorUtil.generateHumanTaskId(
              project.key,
              nextTaskNumber,
            ),
            title: item.title,
            description: item.description,
            projectId,
            creatorId: actorId,
            assigneeId: null,
            workType: "STANDARD_CHECKLIST",
            checklistTemplateItemId: item.id,
            checklistCode: item.code,
            checklistPhase: item.phase,
            checklistStage: item.stage,
            checklistOwnerRole: item.ownerRole,
            checklistDoneWhen: item.doneWhen,
            checklistMandatory: item.mandatory,
            checklistOrder: item.defaultOrder,
            allowParallelWork: item.allowParallelWork,
            priority: item.mandatory ? TaskPriority.HIGH : TaskPriority.MEDIUM,
            status: TaskStatus.UNASSIGNED,
            progress: 0,
            requiresReview: item.requiresReview,
          },
        });
        createdTasks.push(created);
      }

      const byCode = new Map(
        createdTasks.map((task) => [task.checklistCode, task]),
      );
      const dependencyRows: {
        predecessorTaskId: string;
        dependentTaskId: string;
      }[] = [];

      for (const item of templateItems) {
        const dependentTask = byCode.get(item.code);
        if (!dependentTask) continue;

        for (const predecessorCode of item.dependencies || []) {
          const predecessorTask = byCode.get(predecessorCode);
          if (!predecessorTask || predecessorTask.id === dependentTask.id)
            continue;
          dependencyRows.push({
            predecessorTaskId: predecessorTask.id,
            dependentTaskId: dependentTask.id,
          });
        }
      }

      if (dependencyRows.length > 0) {
        await tx.taskDependency.createMany({
          data: dependencyRows,
          skipDuplicates: true,
        });
      }

      const templateVersion =
        dto.templateVersion || templateItems[0]?.templateVersion || "2026.09";
      await tx.project.update({
        where: { id: projectId },
        data: {
          checklistGeneratedAt: new Date(),
          checklistTemplateVersion: templateVersion,
          currentPhase: templateItems[0]?.phase || null,
        },
      });

      await tx.taskActivity.create({
        data: {
          taskId: null,
          projectId,
          userId: actorId,
          actionType: TaskActionType.CREATED,
          description: `Development checklist generated (${createdTasks.length} items).`,
        },
      });

      return { createdCount: createdTasks.length };
    });

    await this.recalculateProductDelivery(projectId);
    await this.recordAudit(
      actorId,
      AuditAction.PROJECT_UPDATED,
      "Project",
      projectId,
      {
        action: "DEVELOPMENT_CHECKLIST_GENERATED",
        createdCount: result.createdCount,
      },
    );

    return {
      success: true,
      message: "Development checklist generated.",
      ...result,
      project: await this.findById(projectId, {
        id: actorId,
        globalRole: actorRole,
      }),
    };
  }

  async getDevelopmentChecklist(
    projectId: string,
    user: { id: string; globalRole: UserRole },
  ) {
    await this.ensureProjectAccess(projectId, user);
    const where: any = {
      projectId,
      deletedAt: null,
      workType: "STANDARD_CHECKLIST",
    };

    if (user.globalRole === UserRole.TEAM_MEMBER) {
      where.assigneeId = user.id;
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
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
                checklistCode: true,
              },
            },
          },
        },
      },
      orderBy: [{ checklistOrder: "asc" }, { taskNumber: "asc" }],
    });

    return {
      summary: this.calculateChecklistSummary(tasks),
      phases: this.calculatePhaseProgress(tasks),
      items: tasks.map((t) => this.mapChecklistTask(t)),
    };
  }

  async assignChecklistItem(
    projectId: string,
    taskId: string,
    dto: AssignChecklistItemDto,
    actorId: string,
    actorRole: UserRole,
  ) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException(
        "Team members cannot assign checklist items.",
      );
    }

    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        projectId,
        deletedAt: null,
        workType: "STANDARD_CHECKLIST",
      },
      include: {
        blockedBy: {
          include: { predecessorTask: { select: { status: true } } },
        },
      },
    });
    if (!task) throw new NotFoundException("Checklist item not found");

    const assigneeId = dto.assigneeId || null;
    if (assigneeId) {
      await this.ensureEligibleProductAssignee(projectId, assigneeId);
    }

    const status = await this.resolveAssignmentStatus(task.id, assigneeId);
    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        assigneeId,
        status,
        dueDate:
          dto.dueDate !== undefined
            ? dto.dueDate
              ? new Date(dto.dueDate)
              : null
            : undefined,
        requiresReview:
          dto.requiresReview !== undefined ? dto.requiresReview : undefined,
        allowParallelWork:
          dto.allowParallelWork !== undefined
            ? dto.allowParallelWork
            : undefined,
        progress: 0,
      },
    });

    await this.recordChecklistAssignmentActivity(
      projectId,
      taskId,
      actorId,
      updated.checklistCode || updated.humanId,
      assigneeId,
    );
    await this.notifyAssignment(updated, assigneeId, actorId);
    await this.recalculateProductDelivery(projectId);

    return this.getDevelopmentChecklist(projectId, {
      id: actorId,
      globalRole: actorRole,
    });
  }

  async bulkAssignChecklist(
    projectId: string,
    dto: BulkResponsibilityAssignmentDto,
    actorId: string,
    actorRole: UserRole,
  ) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException(
        "Team members cannot assign checklist items.",
      );
    }

    const mappings = dto.mappings || {};
    const phaseMappings = dto.phaseMappings || {};
    const roleEntries = [
      ...Object.entries(mappings).filter(([, userId]) => Boolean(userId)),
      ...Object.entries(phaseMappings).filter(([, userId]) => Boolean(userId)),
    ];

    for (const [, userId] of roleEntries) {
      await this.ensureEligibleProductAssignee(projectId, userId as string);
    }

    const checklistItems = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null, workType: "STANDARD_CHECKLIST" },
      select: {
        id: true,
        checklistOwnerRole: true,
        checklistPhase: true,
        assigneeId: true,
        checklistCode: true,
      },
    });

    let assignedCount = 0;
    for (const item of checklistItems) {
      if (item.assigneeId) continue;
      const assigneeId =
        (item.checklistPhase ? phaseMappings[item.checklistPhase] : null) ||
        (item.checklistOwnerRole ? mappings[item.checklistOwnerRole] : null);
      if (!assigneeId) continue;

      const status = await this.resolveAssignmentStatus(item.id, assigneeId);
      const updated = await this.prisma.task.update({
        where: { id: item.id },
        data: { assigneeId, status, progress: 0 },
      });
      await this.recordChecklistAssignmentActivity(
        projectId,
        item.id,
        actorId,
        item.checklistCode || updated.humanId,
        assigneeId,
      );
      await this.notifyAssignment(updated, assigneeId, actorId);
      assignedCount++;
    }

    await this.recalculateProductDelivery(projectId);

    return {
      success: true,
      assignedCount,
      checklist: await this.getDevelopmentChecklist(projectId, {
        id: actorId,
        globalRole: actorRole,
      }),
    };
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
    if (!project) throw new NotFoundException("Project not found");

    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException(
        "Team members cannot post project status updates.",
      );
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
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
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

  private async generateUniqueProjectKey(
    name: string,
    productType?: ProductType,
  ): Promise<string> {
    const words = (name || "").toUpperCase().match(/[A-Z0-9]+/g) || [];
    const typeFallback: Record<string, string> = {
      APP: "APP",
      GAME: "GM",
      WEBSITE_TOOL: "WEB",
    };

    let base = "";
    if (words.length >= 2) {
      base = words
        .map((word) => word[0])
        .join("")
        .slice(0, 4);
    } else {
      base = (
        words[0] ||
        typeFallback[productType || ProductType.GAME] ||
        "PX"
      ).slice(0, 4);
    }

    base = base.replace(/[^A-Z0-9]/g, "");
    if (base.length < 2) {
      base =
        `${base}${typeFallback[productType || ProductType.GAME] || "PX"}`.slice(
          0,
          4,
        );
    }
    if (base.length < 2) {
      base = "PX";
    }

    for (let index = 0; index < 1000; index++) {
      const suffix = index === 0 ? "" : String(index + 1);
      const candidate = `${base.slice(0, 6 - suffix.length)}${suffix}`;
      const existing = await this.prisma.project.findUnique({
        where: { key: candidate },
      });
      if (!existing) return candidate;
    }

    throw new BadRequestException(
      "Could not generate a unique product key. Please try a more specific product name.",
    );
  }

  private async ensureProjectAccess(
    projectId: string,
    user: { id: string; globalRole: UserRole },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
      include: { members: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundException("Product not found");

    if (
      user.globalRole !== UserRole.OWNER &&
      user.globalRole !== UserRole.ADMIN
    ) {
      const isManager = project.projectManagerId === user.id;
      const isMember = project.members.some((m) => m.userId === user.id);
      if (!isManager && !isMember) {
        throw new ForbiddenException("You do not have access to this product.");
      }
    }

    return project;
  }

  private async ensureEligibleProductAssignee(
    projectId: string,
    userId: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        globalRole: UserRole.TEAM_MEMBER,
        isActive: true,
        deletedAt: null,
        projectMemberships: { some: { projectId } },
      },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException({
        code: "INVALID_PRODUCT_ASSIGNEE",
        message:
          "Select an active TEAM_MEMBER who belongs to this product team.",
      });
    }
  }

  private async resolveAssignmentStatus(
    taskId: string,
    assigneeId: string | null,
  ): Promise<TaskStatus> {
    if (!assigneeId) return TaskStatus.UNASSIGNED;

    const dependencies = await this.prisma.taskDependency.findMany({
      where: { dependentTaskId: taskId },
      include: {
        predecessorTask: { select: { status: true } },
      },
    });

    const allSatisfied = dependencies.every(
      (dep) =>
        dep.predecessorTask.status === TaskStatus.DONE ||
        dep.predecessorTask.status === TaskStatus.N_A,
    );

    return allSatisfied ? TaskStatus.READY : TaskStatus.WAITING;
  }

  private calculateChecklistSummary(tasks: any[]) {
    const checklistTasks = tasks.filter(
      (t) => t.workType === "STANDARD_CHECKLIST",
    );
    const applicable = checklistTasks.filter(
      (t) => t.status !== TaskStatus.N_A && t.status !== TaskStatus.CANCELED,
    );
    const totalApplicable = applicable.length;
    const completed = applicable.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    const inProgress = applicable.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS,
    ).length;
    const ready = applicable.filter(
      (t) => t.status === TaskStatus.READY,
    ).length;
    const waiting = applicable.filter(
      (t) => t.status === TaskStatus.WAITING,
    ).length;
    const blocked = applicable.filter(
      (t) => t.status === TaskStatus.BLOCKED,
    ).length;
    const unassigned = applicable.filter(
      (t) =>
        !t.assigneeId ||
        t.status === TaskStatus.UNASSIGNED ||
        t.status === TaskStatus.PLANNED,
    ).length;
    const inReview = applicable.filter(
      (t) => t.status === TaskStatus.IN_REVIEW,
    ).length;
    const notApplicable = checklistTasks.filter(
      (t) => t.status === TaskStatus.N_A,
    ).length;
    const progress =
      totalApplicable === 0
        ? 0
        : Math.round((completed / totalApplicable) * 100);
    const launchReadiness =
      totalApplicable === 0
        ? 0
        : Math.round(((completed + inReview * 0.8) / totalApplicable) * 100);
    const firstOpen = applicable
      .slice()
      .sort(
        (a, b) =>
          (a.checklistOrder || a.taskNumber || 0) -
          (b.checklistOrder || b.taskNumber || 0),
      )
      .find(
        (t) =>
          t.status !== TaskStatus.DONE &&
          t.status !== TaskStatus.N_A &&
          t.status !== TaskStatus.CANCELED,
      );

    return {
      totalApplicable,
      completed,
      inProgress,
      ready,
      waiting,
      blocked,
      unassigned,
      inReview,
      notApplicable,
      progress,
      launchReadiness,
      currentPhase: firstOpen?.checklistPhase || null,
    };
  }

  private calculatePhaseProgress(tasks: any[]) {
    const phaseMap = new Map<string, any[]>();
    for (const task of tasks) {
      if (
        task.workType !== "STANDARD_CHECKLIST" ||
        task.status === TaskStatus.N_A ||
        task.status === TaskStatus.CANCELED
      ) {
        continue;
      }
      const phase = task.checklistPhase || "Custom";
      const list = phaseMap.get(phase) || [];
      list.push(task);
      phaseMap.set(phase, list);
    }

    return Array.from(phaseMap.entries()).map(([phase, phaseTasks]) => {
      const totalApplicable = phaseTasks.length;
      const completed = phaseTasks.filter(
        (t) => t.status === TaskStatus.DONE,
      ).length;
      const inProgress = phaseTasks.filter(
        (t) => t.status === TaskStatus.IN_PROGRESS,
      ).length;
      const ready = phaseTasks.filter(
        (t) => t.status === TaskStatus.READY,
      ).length;
      const waiting = phaseTasks.filter(
        (t) => t.status === TaskStatus.WAITING,
      ).length;
      const blocked = phaseTasks.filter(
        (t) => t.status === TaskStatus.BLOCKED,
      ).length;
      const unassigned = phaseTasks.filter(
        (t) =>
          !t.assigneeId ||
          t.status === TaskStatus.UNASSIGNED ||
          t.status === TaskStatus.PLANNED,
      ).length;

      return {
        phase,
        totalApplicable,
        completed,
        inProgress,
        ready,
        waiting,
        blocked,
        unassigned,
        progress:
          totalApplicable === 0
            ? 0
            : Math.round((completed / totalApplicable) * 100),
      };
    });
  }

  private async recalculateProductDelivery(projectId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      select: {
        status: true,
        progress: true,
        workType: true,
        checklistOrder: true,
        checklistPhase: true,
        checklistStage: true,
        assigneeId: true,
      },
    });
    const checklistSummary = this.calculateChecklistSummary(tasks);

    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        progress: checklistSummary.progress,
        launchReadiness: checklistSummary.launchReadiness,
        currentPhase: checklistSummary.currentPhase,
      },
    });

    return checklistSummary;
  }

  private mapChecklistTask(t: any) {
    return {
      id: t.id,
      humanId: t.humanId,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      progress: t.progress,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      assigneeId: t.assigneeId,
      assignee: t.assignee,
      workType: t.workType,
      checklistTemplateItemId: t.checklistTemplateItemId,
      checklistCode: t.checklistCode,
      checklistPhase: t.checklistPhase,
      checklistStage: t.checklistStage,
      checklistOwnerRole: t.checklistOwnerRole,
      checklistDoneWhen: t.checklistDoneWhen,
      checklistMandatory: t.checklistMandatory,
      checklistOrder: t.checklistOrder,
      allowParallelWork: t.allowParallelWork,
      requiresReview: t.requiresReview,
      blockedBy: (t.blockedBy || []).map((b: any) => ({
        id: b.id,
        predecessorTaskId: b.predecessorTaskId,
        predecessorTask: b.predecessorTask,
      })),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private async recordChecklistAssignmentActivity(
    projectId: string,
    taskId: string,
    actorId: string,
    code: string,
    assigneeId: string | null,
  ) {
    const assignee = assigneeId
      ? await this.prisma.user.findUnique({
          where: { id: assigneeId },
          select: { firstName: true, lastName: true },
        })
      : null;
    const assigneeName = assignee
      ? `${assignee.firstName} ${assignee.lastName}`.trim()
      : "Unassigned";

    await this.prisma.taskActivity.create({
      data: {
        taskId,
        projectId,
        userId: actorId,
        actionType: assigneeId
          ? TaskActionType.ASSIGNED
          : TaskActionType.UNASSIGNED,
        description: `${code} assigned to ${assigneeName}.`,
      },
    });
  }

  private async notifyAssignment(
    task: any,
    assigneeId: string | null,
    actorId: string,
  ) {
    if (!assigneeId || assigneeId === actorId) return;
    await this.prisma.notification.create({
      data: {
        userId: assigneeId,
        type: NotificationType.TASK_ASSIGNED,
        title: "Checklist Item Assigned",
        message: `You were assigned ${task.checklistCode || task.humanId}: ${task.title}`,
        linkUrl: `/projects/${task.projectId}?taskId=${task.id}`,
      },
    });
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
