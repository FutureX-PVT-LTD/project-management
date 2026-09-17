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
  ApplyPhaseAssignmentsDto,
  SaveProjectDraftDto,
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
  AuthUser,
} from "@futurex/shared";
import { IdGeneratorUtil } from "../../common/utils/id-generator.util";
import { projectScope } from '../../common/security/access-policy';
import { MarketingService } from '../marketing/marketing.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService, private marketing: MarketingService) {}

  private draftAccessWhere(actorId: string, actorRole: UserRole) {
    return actorRole === UserRole.OWNER ? {} : { createdById: actorId };
  }

  private async rollbackDraftActivation(project: any, actorId: string) {
    await this.prisma.$transaction(async (tx) => {
      await tx.taskActivity.deleteMany({ where: { projectId: project.id } });
      await tx.task.deleteMany({ where: { projectId: project.id } });
      await tx.marketingSignoffItem.deleteMany({ where: { projectId: project.id } });
      await tx.marketingGate.deleteMany({ where: { projectId: project.id } });
      await tx.marketingBuzzActivity.deleteMany({ where: { projectId: project.id } });
      await tx.marketingContentItem.deleteMany({ where: { projectId: project.id } });
      await tx.marketingChannel.deleteMany({ where: { projectId: project.id } });
      await tx.projectWorkstream.deleteMany({ where: { projectId: project.id } });
      await tx.projectPhaseAssignment.deleteMany({ where: { projectId: project.id } });
      await tx.projectMember.deleteMany({ where: { projectId: project.id } });
      await tx.project.update({
        where: { id: project.id },
        data: {
          key: project.key,
          lifecycleStatus: "DRAFT",
          currentStep: "REVIEW",
          draftDataJson: project.draftDataJson,
          projectManagerId: project.projectManagerId,
          checklistGeneratedAt: null,
          checklistTemplateVersion: null,
          currentPhase: null,
          progress: project.progress,
          launchReadiness: project.launchReadiness,
          updatedById: actorId,
          activationStartedAt: null,
          activatedAt: null,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "PROJECT_ACTIVATION_ROLLED_BACK",
          entityType: "Project",
          entityId: project.id,
          detailsJson: JSON.stringify({ restoredLifecycleStatus: "DRAFT" }),
        },
      });
    });
  }

  async findAll(
    user: { id: string; globalRole: UserRole },
    statusFilter?: string,
  ) {
    const where: any = {
      deletedAt: null,
      lifecycleStatus:
        statusFilter === ProjectStatus.ARCHIVED ? "ARCHIVED" : "ACTIVE",
    };

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
            email: user.globalRole !== UserRole.TEAM_MEMBER,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        workstreams: true,
        members: {
          include: {
            projectRoles: { include: { functionalRole: true } },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                jobTitle: true,
                globalRole: true,
                functionalRoleLinks: { include: { functionalRole: true } },
              },
            },
          },
        },
        milestones: {
          orderBy: { orderIndex: "asc" },
        },
        tasks: {
          where: { deletedAt: null, ...(user.globalRole === UserRole.TEAM_MEMBER ? { assigneeId: user.id } : {}) },
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
      const visibleMembers = p.members;

      return {
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        productType: (p as any).productType as ProductType,
        status: p.status as ProjectStatus,
        health: p.health as ProjectHealth,
        healthReason: user.globalRole === UserRole.TEAM_MEMBER ? undefined : p.healthReason,
        manualHealthOverride: p.manualHealthOverride,
        progress: p.progress,
        launchReadiness: (p as any).launchReadiness,
        targetMarket: p.targetMarket,
        targetLanguage: p.targetLanguage,
        workstreams: p.workstreams,
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
    const project = await this.prisma.project.findFirst({
      where: { AND: [{ id }, projectScope(user)] },
      include: {
        projectManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: user.globalRole !== UserRole.TEAM_MEMBER,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        marketingOwner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true } },
        workstreams: true,
        members: {
          include: {
            projectRoles: { include: { functionalRole: true } },
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: user.globalRole !== UserRole.TEAM_MEMBER,
                avatarUrl: true,
                jobTitle: true,
                globalRole: true,
                functionalRoleLinks: { include: { functionalRole: true } },
              },
            },
          },
        },
        milestones: {
          orderBy: { orderIndex: "asc" },
          include: {
            tasks: {
              where: { deletedAt: null, ...(user.globalRole === UserRole.TEAM_MEMBER ? { assigneeId: user.id } : {}) },
              select: { id: true, status: true },
            },
          },
        },
        updates: {
          where: user.globalRole === UserRole.TEAM_MEMBER ? { authorId: user.id } : {},
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
          where: user.globalRole === UserRole.TEAM_MEMBER ? { userId: user.id, task: { assigneeId: user.id, deletedAt: null } } : {},
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
          where: { deletedAt: null, ...(user.globalRole === UserRole.TEAM_MEMBER ? { assigneeId: user.id } : {}) },
          select: {
            id: true,
            humanId: true,
            title: true,
            description: true,
            workType: true,
            workstream: true,
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
    const visibleMembers = project.members;
    const developmentTasks = project.tasks.filter((task) => task.workstream === "DEVELOPMENT");
    const checklistSummary = this.calculateChecklistSummary(developmentTasks);
    const phaseProgress = this.calculatePhaseProgress(developmentTasks);

    return {
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description,
      targetMarket: project.targetMarket,
      targetLanguage: project.targetLanguage,
      productType: (project as any).productType as ProductType,
      status: project.status as ProjectStatus,
      health: project.health as ProjectHealth,
      healthReason: user.globalRole === UserRole.TEAM_MEMBER ? undefined : project.healthReason,
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
      marketingOwnerId: project.marketingOwnerId,
      marketingOwner: project.marketingOwner,
      workstreams: project.workstreams,
      members: visibleMembers.map((m) => ({
        id: m.id,
        projectId: m.projectId,
        userId: m.userId,
        role: m.role as ProjectMemberRole,
        joinedAt: m.joinedAt.toISOString(),
        user: m.user,
        projectRoles: m.projectRoles.map((link) => link.functionalRole),
        activeAssignmentsCount: project.tasks.filter(
          (task) =>
            task.assigneeId === m.userId &&
            ![TaskStatus.DONE, TaskStatus.CANCELED, TaskStatus.N_A].includes(task.status as TaskStatus),
        ).length,
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
        workstream: t.workstream,
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

  async create(dto: CreateProjectDto, actorId: string, actorRole: UserRole) {
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
      .map((m: any) => m.userId)
      .filter((uid: string) => Boolean(uid));

    const eligibleMembers =
      rawMemberIds.length > 0
        ? await this.prisma.user.findMany({
            where: {
              id: { in: rawMemberIds },
              globalRole: { in: [UserRole.TEAM_MEMBER, UserRole.ADMIN, UserRole.OWNER] },
              isActive: true,
              deletedAt: null,
            },
            select: { id: true, functionalRoleLinks: { where: { functionalRole: { isActive: true } }, select: { functionalRoleId: true } } },
          })
        : [];

    const project = await this.prisma.project.create({
      data: {
        key: cleanKey,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        targetMarket: dto.targetMarket?.trim(),
        targetLanguage: dto.targetLanguage?.trim(),
        productType: dto.productType || ProductType.GAME,
        status: dto.status || ProjectStatus.ACTIVE,
        health: dto.health || ProjectHealth.ON_TRACK,
        startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        projectManagerId,
        members: {
          create: eligibleMembers.map((m) => {
            const requested = dto.memberIds?.find((item) => item.userId === m.id)?.functionalRoleIds || [];
            const allowed = requested.filter((id) => m.functionalRoleLinks.some((link) => link.functionalRoleId === id));
            if (allowed.length !== requested.length) throw new BadRequestException('Project Roles must be selected from each user’s active Functional Roles');
            return { userId: m.id, role: ProjectMemberRole.MEMBER, projectRoles: { create: allowed.map((functionalRoleId) => ({ functionalRoleId })) } };
          }),
        },
      },
    });

    const setup: Record<string, any> = {};
    try {
      if (dto.developmentEnabled !== false) {
        setup.development = await this.generateDevelopmentChecklist(project.id, actorId, actorRole, {});
      }
      if (dto.marketingEnabled !== false) {
        setup.marketing = await this.marketing.initialize(project.id, { id: actorId, globalRole: actorRole } as AuthUser);
      }
    } catch (error) {
      // Workstream records cascade with this just-created Product, avoiding a visible partial setup.
      await this.prisma.project.delete({ where: { id: project.id } });
      throw error;
    }

    for (const member of eligibleMembers) {
      await this.prisma.notification.create({
        data: {
          userId: member.id,
          type: NotificationType.PROJECT_MEMBER_ADDED,
          title: "Assigned to Product",
          message: `You were added to Product ${project.name} (${project.key})`,
          linkUrl: `/projects/${project.id}`,
        },
      });
    }

    await this.recordAudit(actorId, AuditAction.PROJECT_CREATED, "Project", project.id, {
      key: project.key,
      name: project.name,
      workstreams: Object.keys(setup),
    });

    return { ...(await this.findById(project.id, {
      id: actorId,
      globalRole: UserRole.OWNER,
    })), setup };
  }

  async saveDraft(
    dto: SaveProjectDraftDto,
    actorId: string,
    actorRole: UserRole,
  ) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException("Team members cannot create or edit project drafts.");
    }

    let project: any;

    if (dto.id) {
      // Update existing draft
      project = await this.prisma.project.findUnique({
        where: { id: dto.id },
      });

      if (!project || project.deletedAt) {
        throw new NotFoundException("Draft project not found");
      }

      if (project.lifecycleStatus !== "DRAFT") {
        throw new BadRequestException("Cannot edit an active product as a draft");
      }

      if (actorRole !== UserRole.OWNER && project.createdById !== actorId) {
        throw new ForbiddenException("You are not authorized to edit this draft");
      }

      // Check key uniqueness if key is updated
      let validKey = project.key;
      if (dto.key && dto.key !== project.key) {
        const cleanKey = dto.key.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
        if (/^[A-Z0-9]{2,6}$/.test(cleanKey)) {
          const keyConflict = await this.prisma.project.findFirst({
            where: { key: cleanKey, id: { not: dto.id } },
          });
          if (!keyConflict) {
            validKey = cleanKey;
          }
        }
      }

      let existingDraftData: any = {};
      try {
        if (project.draftDataJson) {
          existingDraftData = JSON.parse(project.draftDataJson);
        }
      } catch {}

      const updatedDraftData = {
        ...existingDraftData,
        selectedMemberIds: dto.selectedMemberIds !== undefined ? dto.selectedMemberIds : existingDraftData.selectedMemberIds || [],
        projectRoles: dto.projectRoles !== undefined ? dto.projectRoles : existingDraftData.projectRoles || {},
        developmentEnabled: dto.developmentEnabled !== undefined ? dto.developmentEnabled : (existingDraftData.developmentEnabled !== false),
        marketingEnabled: dto.marketingEnabled !== undefined ? dto.marketingEnabled : (existingDraftData.marketingEnabled !== false),
        currentStep: dto.currentStep || project.currentStep || "DETAILS",
      };

      project = await this.prisma.project.update({
        where: { id: dto.id },
        data: {
          key: validKey,
          name:
            dto.name !== undefined
              ? dto.name.trim() || "Untitled Draft"
              : project.name,
          description: dto.description !== undefined ? dto.description?.trim() : project.description,
          targetMarket: dto.targetMarket !== undefined ? dto.targetMarket?.trim() : project.targetMarket,
          targetLanguage: dto.targetLanguage !== undefined ? dto.targetLanguage?.trim() : project.targetLanguage,
          productType: dto.productType || project.productType,
          startDate: dto.startDate ? new Date(dto.startDate) : project.startDate,
          targetDate: dto.targetDate !== undefined ? (dto.targetDate ? new Date(dto.targetDate) : null) : project.targetDate,
          currentStep: dto.currentStep || project.currentStep || "DETAILS",
          draftDataJson: JSON.stringify(updatedDraftData),
          updatedById: actorId,
        },
      });

      return {
        ...project,
        ...updatedDraftData,
      };
    } else {
      // Create new draft
      let initialKey = "";
      if (dto.key) {
        const cleanKey = dto.key.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
        if (/^[A-Z0-9]{2,6}$/.test(cleanKey)) {
          const keyConflict = await this.prisma.project.findFirst({ where: { key: cleanKey } });
          if (!keyConflict) initialKey = cleanKey;
        }
      }

      if (!initialKey) {
        initialKey = await this.generateUniqueProjectKey(dto.name || "DRAFT", dto.productType || ProductType.GAME);
      }

      const initialDraftData = {
        selectedMemberIds: dto.selectedMemberIds || [],
        projectRoles: dto.projectRoles || {},
        developmentEnabled: dto.developmentEnabled !== false,
        marketingEnabled: dto.marketingEnabled !== false,
        currentStep: dto.currentStep || "DETAILS",
      };

      project = await this.prisma.$transaction(async (tx) => {
        const created = await tx.project.create({
          data: {
          key: initialKey,
          name: (dto.name || "").trim() || "Untitled Draft",
          description: dto.description?.trim(),
          targetMarket: dto.targetMarket?.trim(),
          targetLanguage: dto.targetLanguage?.trim(),
          productType: dto.productType || ProductType.GAME,
          status: ProjectStatus.ACTIVE,
          health: ProjectHealth.ON_TRACK,
          startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
          targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
          projectManagerId: actorId,
          createdById: actorId,
          updatedById: actorId,
          lifecycleStatus: "DRAFT",
          currentStep: dto.currentStep || "DETAILS",
          draftDataJson: JSON.stringify(initialDraftData),
          },
        });
        await tx.auditLog.create({
          data: {
            actorId,
            action: "PRODUCT_DRAFT_CREATED",
            entityType: "Project",
            entityId: created.id,
            detailsJson: JSON.stringify({ currentStep: created.currentStep }),
          },
        });
        return created;
      });

      return {
        ...project,
        ...initialDraftData,
      };
    }
  }

  async getDrafts(actorId: string, actorRole: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      return [];
    }

    const drafts = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        lifecycleStatus: "DRAFT",
        ...this.draftAccessWhere(actorId, actorRole),
      },
      include: {
        projectManager: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return drafts.map((d) => {
      let parsed: any = {};
      try {
        if (d.draftDataJson) parsed = JSON.parse(d.draftDataJson);
      } catch {}
      return {
        id: d.id,
        key: d.key,
        name: d.name,
        productType: d.productType,
        currentStep: d.currentStep || parsed.currentStep || "DETAILS",
        startDate: d.startDate,
        targetDate: d.targetDate,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        createdById: d.createdById,
        projectManager: d.projectManager,
        selectedMemberIds: parsed.selectedMemberIds || [],
        projectRoles: parsed.projectRoles || {},
        developmentEnabled: parsed.developmentEnabled !== false,
        marketingEnabled: parsed.marketingEnabled !== false,
      };
    });
  }

  async getDraft(id: string, actorId: string, actorRole: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new NotFoundException("Draft not found");
    }

    const draft = await this.prisma.project.findFirst({
      where: {
        id,
        deletedAt: null,
        lifecycleStatus: "DRAFT",
        ...this.draftAccessWhere(actorId, actorRole),
      },
      include: {
        projectManager: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    if (!draft) {
      throw new NotFoundException("Draft not found");
    }

    let parsed: any = {};
    try {
      if (draft.draftDataJson) parsed = JSON.parse(draft.draftDataJson);
    } catch {}

    return {
      id: draft.id,
      key: draft.key,
      name: draft.name,
      description: draft.description || "",
      targetMarket: draft.targetMarket || "",
      targetLanguage: draft.targetLanguage || "",
      productType: draft.productType,
      currentStep: draft.currentStep || parsed.currentStep || "DETAILS",
      startDate: draft.startDate ? draft.startDate.toISOString() : null,
      targetDate: draft.targetDate ? draft.targetDate.toISOString() : null,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      createdById: draft.createdById,
      projectManager: draft.projectManager,
      selectedMemberIds: parsed.selectedMemberIds || [],
      projectRoles: parsed.projectRoles || {},
      developmentEnabled: parsed.developmentEnabled !== false,
      marketingEnabled: parsed.marketingEnabled !== false,
    };
  }

  async discardDraft(id: string, actorId: string, actorRole: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException("Team members cannot discard project drafts.");
    }

    const draft = await this.prisma.project.findFirst({
      where: {
        id,
        deletedAt: null,
        lifecycleStatus: "DRAFT",
        ...this.draftAccessWhere(actorId, actorRole),
      },
    });

    if (!draft) {
      throw new NotFoundException("Draft not found");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          actorId,
          action: "PRODUCT_DRAFT_DISCARDED",
          entityType: "Project",
          entityId: id,
          detailsJson: JSON.stringify({ name: draft.name, key: draft.key, wasDraft: true }),
        },
      });
      await tx.project.delete({ where: { id } });
    });

    return { success: true, id };
  }

  async activateDraft(id: string, actorId: string, actorRole: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) {
      throw new ForbiddenException("Team members cannot activate projects.");
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.draftAccessWhere(actorId, actorRole),
      },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    // Idempotency: if already ACTIVE, return existing
    if (project.lifecycleStatus === "ACTIVE") {
      return { success: true, project, alreadyActive: true };
    }

    if (project.lifecycleStatus !== "DRAFT") {
      throw new BadRequestException("Only draft projects can be activated");
    }

    let draftData: any = {};
    try {
      if (project.draftDataJson) draftData = JSON.parse(project.draftDataJson);
    } catch {}

    const trimmedName = (project.name || "").trim();
    if (!trimmedName || trimmedName === "Untitled Draft") {
      throw new BadRequestException("Product name is required before activation");
    }

    let finalKey = (project.key || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!/^[A-Z0-9]{2,6}$/.test(finalKey)) {
      finalKey = await this.generateUniqueProjectKey(trimmedName, project.productType as ProductType);
    } else {
      const keyConflict = await this.prisma.project.findFirst({
        where: { key: finalKey, id: { not: id }, deletedAt: null },
      });
      if (keyConflict) {
        finalKey = await this.generateUniqueProjectKey(trimmedName, project.productType as ProductType);
      }
    }

    if (project.startDate && project.targetDate) {
      if (new Date(project.targetDate) < new Date(project.startDate)) {
        throw new BadRequestException("Target date must be on or after start date");
      }
    }

    const rawMemberIds: string[] = Array.isArray(draftData.selectedMemberIds) ? draftData.selectedMemberIds : [];
    const eligibleMembers = rawMemberIds.length > 0
      ? await this.prisma.user.findMany({
          where: {
            id: { in: rawMemberIds },
            globalRole: { in: [UserRole.TEAM_MEMBER, UserRole.ADMIN, UserRole.OWNER] },
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            functionalRoleLinks: {
              where: { functionalRole: { isActive: true } },
              select: { functionalRoleId: true },
            },
          },
        })
      : [];

    if (eligibleMembers.length !== new Set(rawMemberIds).size) {
      throw new BadRequestException("Every selected team member must still be active and available");
    }

    const developmentEnabled = draftData.developmentEnabled !== false;
    const marketingEnabled = draftData.marketingEnabled !== false;
    if (!developmentEnabled && !marketingEnabled) {
      throw new BadRequestException("Enable at least one Product workstream before activation");
    }
    if (marketingEnabled && !project.targetDate) {
      throw new BadRequestException("Target delivery date is required when Marketing is enabled");
    }

    const projectRolesMap: Record<string, string[]> = draftData.projectRoles || {};
    const validRoleIdsByMember = new Map<string, string[]>();
    for (const member of eligibleMembers) {
      const requestedRoleIds = projectRolesMap[member.id] || [];
      const allowedRoleIds = requestedRoleIds.filter((roleId) =>
        member.functionalRoleLinks.some((link) => link.functionalRoleId === roleId),
      );
      if (allowedRoleIds.length !== requestedRoleIds.length) {
        throw new BadRequestException("Selected Product roles must match the member's active Functional Roles");
      }
      validRoleIdsByMember.set(member.id, allowedRoleIds);
    }

    const claimed = await this.prisma.project.updateMany({
      where: {
        id,
        lifecycleStatus: "DRAFT",
        activationStartedAt: null,
      },
      data: {
        activationStartedAt: new Date(),
        updatedById: actorId,
      },
    });
    if (claimed.count !== 1) {
      const latest = await this.prisma.project.findUnique({ where: { id } });
      if (latest?.lifecycleStatus === "ACTIVE") {
        return { success: true, project: latest, alreadyActive: true };
      }
      throw new BadRequestException("Product activation is already in progress. Please wait and retry.");
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.project.update({
          where: { id },
          data: {
            name: trimmedName,
            key: finalKey,
            lifecycleStatus: "ACTIVE",
            currentStep: "COMPLETED",
            projectManagerId: actorId,
            updatedById: actorId,
          },
        });

        await tx.projectMember.deleteMany({ where: { projectId: id } });

        for (const member of eligibleMembers) {
          const allowedRoleIds = validRoleIdsByMember.get(member.id) || [];
          await tx.projectMember.create({
            data: {
              projectId: id,
              userId: member.id,
              role: ProjectMemberRole.MEMBER,
              projectRoles: {
                create: allowedRoleIds.map((functionalRoleId) => ({ functionalRoleId })),
              },
            },
          });
        }
      });
    } catch (error) {
      await this.rollbackDraftActivation(project, actorId);
      throw error;
    }

    const setup: Record<string, any> = {};
    try {
      if (developmentEnabled) {
        setup.development = await this.generateDevelopmentChecklist(id, actorId, actorRole, {});
      }
      if (marketingEnabled) {
        setup.marketing = await this.marketing.initialize(id, { id: actorId, globalRole: actorRole } as AuthUser);
      }
      await this.prisma.project.update({
        where: { id },
        data: {
          activatedAt: new Date(),
          activationStartedAt: null,
          draftDataJson: null,
          updatedById: actorId,
        },
      });
      await this.recordAudit(
        actorId,
        AuditAction.PROJECT_CREATED,
        "Project",
        id,
        {
          name: trimmedName,
          key: finalKey,
          activatedFromDraft: true,
        },
      );
    } catch (error) {
      await this.rollbackDraftActivation(project, actorId);
      throw error;
    }

    for (const member of eligibleMembers) {
      try {
        await this.prisma.notification.create({
          data: {
            userId: member.id,
            type: NotificationType.PROJECT_MEMBER_ADDED,
            title: "Assigned to Product",
            message: `You were added to Product ${trimmedName} (${finalKey})`,
            linkUrl: `/projects/${id}`,
          },
        });
      } catch {}
    }

    const activatedProject = await this.prisma.project.findUnique({
      where: { id },
      include: {
        projectManager: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        members: {
          include: {
            projectRoles: { include: { functionalRole: true } },
            user: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true },
            },
          },
        },
      },
    });

    return {
      success: true,
      project: activatedProject,
      setup,
    };
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
    if (project.lifecycleStatus === "DRAFT") {
      throw new BadRequestException(
        "Draft Products must be updated through the draft endpoint and activated explicitly.",
      );
    }

    await this.ensureManagementScope(id, actorId, actorRole);
    if (dto.productType && dto.productType !== project.productType && project.checklistGeneratedAt) {
      throw new BadRequestException('Product Type cannot be changed after checklist work has been generated');
    }
    let directTargetDate = dto.targetDate ? new Date(dto.targetDate) : undefined;
    if (directTargetDate && directTargetDate.getTime() !== project.targetDate?.getTime()) {
      const marketing = await this.prisma.projectWorkstream.findUnique({
        where: { projectId_workstream: { projectId: id, workstream: "MARKETING" } },
        select: { generatedAt: true },
      });
      if (marketing?.generatedAt) {
        await this.marketing.reschedule(id, dto.targetDate!, {
          id: actorId,
          globalRole: actorRole!,
        } as AuthUser);
        directTargetDate = undefined;
      }
    }

    const updated = await this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        targetMarket: dto.targetMarket?.trim(),
        targetLanguage: dto.targetLanguage?.trim(),
        productType: dto.productType,
        status: dto.status,
        lifecycleStatus:
          dto.status === ProjectStatus.ARCHIVED
            ? "ARCHIVED"
            : project.lifecycleStatus === "ARCHIVED" && dto.status
              ? "ACTIVE"
              : undefined,
        health: dto.health,
        healthReason: dto.healthReason,
        manualHealthOverride: dto.manualHealthOverride,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        targetDate: directTargetDate,
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
      where: { projectId, workstream: "DEVELOPMENT", deletedAt: null, status: { notIn: ["CANCELED"] } },
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
    functionalRoleIds: string[] = [],
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
    await this.ensureManagementScope(projectId, actorId, actorRole);

    // Verify target user is an active TEAM_MEMBER
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
    });
    if (!targetUser || !targetUser.isActive) {
      throw new BadRequestException("Target user is not an active user");
    }
    if (![UserRole.TEAM_MEMBER, UserRole.ADMIN, UserRole.OWNER].includes(targetUser.globalRole as UserRole)) {
      throw new BadRequestException(
        "Only TEAM_MEMBER users can be assigned as project members",
      );
    }

    await this.validateProjectRolesForUser(userId, functionalRoleIds);
    const member = await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, role: ProjectMemberRole.MEMBER },
      update: { role: ProjectMemberRole.MEMBER },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, globalRole: true } }, projectRoles: true },
    });
    if (functionalRoleIds.length) await this.prisma.projectMemberRoleAssignment.createMany({ data: functionalRoleIds.map((functionalRoleId) => ({ projectMemberId: member.id, functionalRoleId })), skipDuplicates: true });

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
    for (const functionalRoleId of functionalRoleIds) await this.recordAudit(actorId, 'PROJECT_ROLE_ADDED' as AuditAction, 'ProjectMember', member.id, { projectId, userId, functionalRoleId });

    return member;
  }

  async updateMemberRoles(projectId: string, userId: string, functionalRoleIds: string[], actorId: string, actorRole?: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) throw new ForbiddenException('Team members cannot manage Project roles.');
    await this.ensureManagementScope(projectId, actorId, actorRole);
    const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } }, include: { projectRoles: true } });
    if (!member) throw new NotFoundException('Product member not found');
    await this.validateProjectRolesForUser(userId, functionalRoleIds);
    const removed = member.projectRoles.filter((link) => !functionalRoleIds.includes(link.functionalRoleId)).map((link) => link.functionalRoleId);
    if (removed.length) {
      const active = await this.prisma.task.count({ where: { projectId, assigneeId: userId, deletedAt: null, status: { in: ['UNASSIGNED','WAITING','READY','IN_PROGRESS','IN_REVIEW','BLOCKED'] }, checklistTemplateItem: { eligibleRoles: { some: { functionalRoleId: { in: removed } } } } } });
      if (active) throw new BadRequestException(`${active} active assignments still require the Project role being removed. Reassign them first.`);
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.projectMemberRoleAssignment.deleteMany({ where: { projectMemberId: member.id } });
      if (functionalRoleIds.length) await tx.projectMemberRoleAssignment.createMany({ data: functionalRoleIds.map((functionalRoleId) => ({ projectMemberId: member.id, functionalRoleId })) });
      await tx.auditLog.create({ data: { actorId, action: 'PROJECT_ROLES_UPDATED', entityType: 'ProjectMember', entityId: member.id, detailsJson: JSON.stringify({ projectId, userId, functionalRoleIds }) } });
      for (const functionalRoleId of functionalRoleIds.filter((id) => !member.projectRoles.some((role) => role.functionalRoleId === id))) await tx.auditLog.create({ data: { actorId, action: 'PROJECT_ROLE_ADDED', entityType: 'ProjectMember', entityId: member.id, detailsJson: JSON.stringify({ projectId, userId, functionalRoleId }) } });
      for (const functionalRoleId of removed) await tx.auditLog.create({ data: { actorId, action: 'PROJECT_ROLE_REMOVED', entityType: 'ProjectMember', entityId: member.id, detailsJson: JSON.stringify({ projectId, userId, functionalRoleId }) } });
    });
    return { success: true };
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
    await this.ensureManagementScope(projectId, actorId, actorRole);

    const activeAssignments = await this.prisma.task.count({ where: { projectId, assigneeId: userId, deletedAt: null, status: { in: ['WAITING','READY','IN_PROGRESS','IN_REVIEW','BLOCKED'] } } });
    if (activeAssignments) throw new BadRequestException(`This member has ${activeAssignments} active assignments. Reassign work before removing.`);
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
        workstream: "DEVELOPMENT",
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
    await this.ensureManagementScope(projectId, actorId, actorRole);

    const project = await this.prisma.project.findUnique({
      where: { id: projectId, deletedAt: null },
      include: {
        tasks: { where: { deletedAt: null, workType: "STANDARD_CHECKLIST", workstream: "DEVELOPMENT" } },
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
      const claimed = await tx.project.updateMany({
        where: { id: projectId, checklistGeneratedAt: null, deletedAt: null },
        data: { checklistGeneratedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('Checklist already generated');
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
            workstream: "DEVELOPMENT",
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
      await tx.projectWorkstream.upsert({
        where: { projectId_workstream: { projectId, workstream: "DEVELOPMENT" } },
        update: { templateVersion, status: "SETUP", generatedAt: new Date() },
        create: { projectId, workstream: "DEVELOPMENT", templateVersion, status: "SETUP", generatedAt: new Date() },
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
      workstream: "DEVELOPMENT",
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
    await this.ensureManagementScope(projectId, actorId, actorRole);

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
      await this.ensureActiveProductMember(projectId, assigneeId);
    }
    if (task.assigneeId !== assigneeId && task.status === TaskStatus.IN_REVIEW) throw new BadRequestException('Return or cancel the review before reassignment');
    if (task.assigneeId !== assigneeId && task.status === TaskStatus.DONE) throw new BadRequestException('Completed work ownership is historical and cannot be changed');
    if (task.assigneeId !== assigneeId && task.status === TaskStatus.IN_PROGRESS && !dto.confirmReassignment) throw new BadRequestException('Confirm reassignment of work in progress');
    if (!assigneeId && ![TaskStatus.UNASSIGNED, TaskStatus.TODO, TaskStatus.READY, TaskStatus.WAITING].includes(task.status as TaskStatus)) throw new BadRequestException('Active work must be reassigned, not left without an owner');
    const initialStatus = await this.resolveAssignmentStatus(task.id, assigneeId);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.task.update({
        where: { id: taskId },
        data: {
        assigneeId,
        ...([TaskStatus.UNASSIGNED, TaskStatus.TODO, TaskStatus.READY, TaskStatus.WAITING].includes(task.status as TaskStatus) ? { status: initialStatus } : {}),
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
      },
      });
      if (task.assigneeId !== assigneeId) {
        await tx.taskAssignmentHistory.create({ data: { taskId, previousAssigneeId: task.assigneeId, newAssigneeId: assigneeId, changedById: actorId, reason: dto.reason?.trim() } });
        await tx.auditLog.create({ data: { actorId, action: task.assigneeId ? 'TASK_REASSIGNED' : 'TASK_ASSIGNED', entityType: 'Task', entityId: taskId, detailsJson: JSON.stringify({ oldAssigneeId: task.assigneeId, newAssigneeId: assigneeId, reason: dto.reason }) } });
      }
      return row;
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

  async getAssignmentWorkspace(projectId: string, workstream: string, actor: AuthUser) {
    if (![UserRole.ADMIN, UserRole.OWNER].includes(actor.globalRole)) throw new ForbiddenException('Management permission required');
    await this.ensureManagementScope(projectId, actor.id, actor.globalRole);
    const stream = workstream === 'MARKETING' ? 'MARKETING' : 'DEVELOPMENT';
    const [tasks, members, savedPhases] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId, workstream: stream, workType: 'STANDARD_CHECKLIST', deletedAt: null },
        orderBy: [{ checklistOrder: 'asc' }, { taskNumber: 'asc' }],
      }),
      this.prisma.projectMember.findMany({
        where: { projectId, user: { isActive: true, deletedAt: null } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, avatarUrl: true } },
          projectRoles: { include: { functionalRole: true } },
        },
        orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
      }),
      this.prisma.projectPhaseAssignment.findMany({
        where: { projectId, workstream: stream },
        include: { members: { include: { user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, avatarUrl: true } } } } },
      }),
    ]);
    const savedByPhase = new Map(savedPhases.map((phase) => [phase.phaseKey, phase]));
    const phases = new Map<string, any>();
    for (const task of tasks) {
      const phaseKey = task.checklistPhase?.trim() || 'Uncategorized';
      if (!phases.has(phaseKey)) {
        const saved = savedByPhase.get(phaseKey);
        phases.set(phaseKey, {
          phaseKey,
          orderIndex: task.checklistOrder ?? task.taskNumber,
          defaultAssigneeId: saved?.defaultAssigneeId || null,
          memberIds: saved?.members.map((member) => member.userId) || [],
          tasks: [],
        });
      }
      phases.get(phaseKey).tasks.push({ id: task.id, humanId: task.humanId, title: task.title, phase: phaseKey, assigneeId: task.assigneeId, status: task.status, progress: task.progress, dueDate: task.dueDate });
    }
    const phaseRows = [...phases.values()].sort((a, b) => a.orderIndex - b.orderIndex).map((phase) => ({
      ...phase,
      taskCount: phase.tasks.length,
      assignedCount: phase.tasks.filter((task: any) => Boolean(task.assigneeId)).length,
      unassignedCount: phase.tasks.filter((task: any) => !task.assigneeId).length,
    }));
    return {
      workstream: stream,
      totalItems: tasks.length,
      assignedItems: tasks.filter((task) => Boolean(task.assigneeId)).length,
      unassignedItems: tasks.filter((task) => !task.assigneeId).length,
      readyItems: tasks.filter((task) => task.status === TaskStatus.READY).length,
      waitingItems: tasks.filter((task) => [TaskStatus.WAITING, TaskStatus.BLOCKED].includes(task.status as TaskStatus)).length,
      members: members.map((member) => ({
        id: member.userId,
        ...member.user,
        projectRoles: member.projectRoles.map((link) => link.functionalRole),
      })),
      phases: phaseRows,
    };
  }

  async applyPhaseAssignments(projectId: string, dto: ApplyPhaseAssignmentsDto, actorId: string, actorRole: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) throw new ForbiddenException('Team members cannot assign phases');
    await this.ensureManagementScope(projectId, actorId, actorRole);
    if (!dto.assignments.length || dto.assignments.length > 50) throw new BadRequestException('Provide between 1 and 50 phase assignments');
    const stream = dto.workstream === 'MARKETING' ? 'MARKETING' : 'DEVELOPMENT';
    const requestedPhases = dto.assignments.map((item) => item.phaseKey.trim());
    if (new Set(requestedPhases).size !== requestedPhases.length) throw new BadRequestException('Duplicate phase assignment');
    const tasks = await this.prisma.task.findMany({
      where: { projectId, workstream: stream, workType: 'STANDARD_CHECKLIST', deletedAt: null },
      orderBy: [{ checklistOrder: 'asc' }, { taskNumber: 'asc' }],
    });
    const validPhases = new Set(tasks.map((task) => task.checklistPhase?.trim() || 'Uncategorized'));
    const memberIds = [...new Set(dto.assignments.flatMap((item) => [item.defaultAssigneeId, ...(item.additionalMemberIds || [])]).filter(Boolean) as string[])];
    const activeMembers = await this.prisma.projectMember.findMany({
      where: { projectId, userId: { in: memberIds }, user: { isActive: true, deletedAt: null } },
      select: { userId: true },
    });
    if (activeMembers.length !== memberIds.length) throw new BadRequestException('Every selected person must be an active Product Team member');

    let assignedCount = 0;
    let reassignedCount = 0;
    await this.prisma.$transaction(async (tx) => {
      for (const input of dto.assignments) {
        const phaseKey = input.phaseKey.trim();
        if (!validPhases.has(phaseKey)) throw new BadRequestException(`Unknown ${stream.toLowerCase()} phase: ${phaseKey}`);
        const defaultAssigneeId = input.defaultAssigneeId || null;
        const desiredMemberIds = [...new Set([defaultAssigneeId, ...(input.additionalMemberIds || [])].filter(Boolean) as string[])];
        const phaseAssignment = await tx.projectPhaseAssignment.upsert({
          where: { projectId_workstream_phaseKey: { projectId, workstream: stream, phaseKey } },
          create: { projectId, workstream: stream, phaseKey, defaultAssigneeId, createdById: actorId, updatedById: actorId },
          update: { defaultAssigneeId, updatedById: actorId },
          include: { members: true },
        });
        const existingMemberIds = phaseAssignment.members.map((member) => member.userId);
        const removedIds = existingMemberIds.filter((id) => !desiredMemberIds.includes(id));
        const addedIds = desiredMemberIds.filter((id) => !existingMemberIds.includes(id));
        if (removedIds.length) {
          const activeOwned = await tx.task.count({ where: { projectId, workstream: stream, checklistPhase: phaseKey, assigneeId: { in: removedIds }, deletedAt: null, status: { in: [TaskStatus.UNASSIGNED, TaskStatus.WAITING, TaskStatus.READY, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.BLOCKED] } } });
          if (activeOwned) throw new BadRequestException('A removed phase member still owns active work. Reassign those tasks first.');
          await tx.projectPhaseMember.deleteMany({ where: { phaseAssignmentId: phaseAssignment.id, userId: { in: removedIds } } });
          for (const userId of removedIds) await tx.auditLog.create({ data: { actorId, action: 'PHASE_MEMBER_REMOVED', entityType: 'ProjectPhaseAssignment', entityId: phaseAssignment.id, detailsJson: JSON.stringify({ projectId, workstream: stream, phaseKey, userId }) } });
        }
        await tx.projectPhaseMember.updateMany({ where: { phaseAssignmentId: phaseAssignment.id }, data: { isDefault: false } });
        for (const userId of desiredMemberIds) {
          await tx.projectPhaseMember.upsert({
            where: { phaseAssignmentId_userId: { phaseAssignmentId: phaseAssignment.id, userId } },
            create: { phaseAssignmentId: phaseAssignment.id, userId, isDefault: userId === defaultAssigneeId },
            update: { isDefault: userId === defaultAssigneeId },
          });
        }
        for (const userId of addedIds) await tx.auditLog.create({ data: { actorId, action: 'PHASE_MEMBER_ADDED', entityType: 'ProjectPhaseAssignment', entityId: phaseAssignment.id, detailsJson: JSON.stringify({ projectId, workstream: stream, phaseKey, userId, isDefault: userId === defaultAssigneeId }) } });
        await tx.auditLog.create({ data: { actorId, action: stream === 'MARKETING' ? 'MARKETING_PHASE_ASSIGNED' : 'DEVELOPMENT_PHASE_ASSIGNED', entityType: 'ProjectPhaseAssignment', entityId: phaseAssignment.id, detailsJson: JSON.stringify({ projectId, workstream: stream, phaseKey, defaultAssigneeId, memberIds: desiredMemberIds }) } });
        if (!defaultAssigneeId) continue;
        const phaseTasks = tasks.filter((task) => (task.checklistPhase?.trim() || 'Uncategorized') === phaseKey && (!task.assigneeId || (input.reassignActive && [TaskStatus.WAITING, TaskStatus.READY, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED].includes(task.status as TaskStatus))));
        for (const task of phaseTasks) {
          if (task.assigneeId === defaultAssigneeId) continue;
          const previousAssigneeId = task.assigneeId;
          const status = previousAssigneeId ? task.status : await this.resolveAssignmentStatus(task.id, defaultAssigneeId);
          await tx.task.update({ where: { id: task.id }, data: { assigneeId: defaultAssigneeId, status } });
          await tx.taskAssignmentHistory.create({ data: { taskId: task.id, previousAssigneeId, newAssigneeId: defaultAssigneeId, changedById: actorId, reason: `Phase assignment: ${phaseKey}` } });
          await tx.auditLog.create({ data: { actorId, action: previousAssigneeId ? 'TASK_REASSIGNED' : (stream === 'MARKETING' ? 'MARKETING_ITEM_ASSIGNED' : 'TASK_ASSIGNED'), entityType: 'Task', entityId: task.id, detailsJson: JSON.stringify({ projectId, phaseKey, oldAssigneeId: previousAssigneeId, newAssigneeId: defaultAssigneeId }) } });
          previousAssigneeId ? reassignedCount++ : assignedCount++;
        }
      }
    });
    await this.recalculateProductDelivery(projectId);
    return { success: true, assignedCount, reassignedCount };
  }

  async bulkAssignWork(projectId: string, dto: BulkResponsibilityAssignmentDto, actorId: string, actorRole: UserRole) {
    if (actorRole === UserRole.TEAM_MEMBER) throw new ForbiddenException('Team members cannot assign work');
    await this.ensureManagementScope(projectId, actorId, actorRole);
    const mappings = dto.mappings || {};
    if (Object.keys(mappings).length > 50) throw new BadRequestException('Too many assignment mappings');
    const stream = dto.workstream === 'MARKETING' ? 'MARKETING' : 'DEVELOPMENT';
    const tasks = await this.prisma.task.findMany({ where: { projectId, workstream: stream, workType: 'STANDARD_CHECKLIST', deletedAt: null, assigneeId: null }, include: { checklistTemplateItem: { include: { eligibleRoles: true } } } });
    let assignedCount = 0;
    for (const task of tasks) {
      const eligible = task.checklistTemplateItem?.eligibleRoles || [];
      const primary = eligible.find((link) => link.isPrimary) || eligible[0];
      const assigneeId = primary ? mappings[primary.functionalRoleId] : null;
      if (!assigneeId) continue;
      await this.ensureEligibleProductAssignee(projectId, assigneeId, task.id);
      const status = await this.resolveAssignmentStatus(task.id, assigneeId);
      await this.prisma.$transaction(async (tx) => {
        await tx.task.update({ where: { id: task.id }, data: { assigneeId, status } });
        await tx.taskAssignmentHistory.create({ data: { taskId: task.id, previousAssigneeId: null, newAssigneeId: assigneeId, changedById: actorId, reason: `Bulk ${stream.toLowerCase()} assignment` } });
        await tx.auditLog.create({ data: { actorId, action: stream === 'MARKETING' ? 'MARKETING_ITEM_ASSIGNED' : 'TASK_ASSIGNED', entityType: 'Task', entityId: task.id, detailsJson: JSON.stringify({ newAssigneeId: assigneeId, functionalRoleId: primary.functionalRoleId }) } });
      });
      assignedCount++;
    }
    await this.recalculateProductDelivery(projectId);
    return { success: true, assignedCount };
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
    await this.ensureManagementScope(projectId, actorId, actorRole);

    const mappings = dto.mappings || {};
    const phaseMappings = dto.phaseMappings || {};
    const values = [...Object.values(mappings), ...Object.values(phaseMappings)];
    if (values.length > 100 || values.some((value) => value !== null && typeof value !== 'string')) {
      throw new BadRequestException('Invalid assignment mappings');
    }
    const roleEntries = [
      ...Object.entries(mappings).filter(([, userId]) => Boolean(userId)),
      ...Object.entries(phaseMappings).filter(([, userId]) => Boolean(userId)),
    ];

    for (const [, userId] of roleEntries) {
      await this.ensureEligibleProductAssignee(projectId, userId as string);
    }

    const checklistItems = await this.prisma.task.findMany({
      where: { projectId, deletedAt: null, workType: "STANDARD_CHECKLIST", workstream: "DEVELOPMENT" },
      select: {
        id: true,
        checklistOwnerRole: true,
        checklistPhase: true,
        assigneeId: true,
        checklistCode: true,
        status: true,
      },
    });

    let assignedCount = 0;
    for (const item of checklistItems) {
      if (item.assigneeId && !(item.checklistPhase && phaseMappings[item.checklistPhase])) continue;
      const assigneeId =
        (item.checklistPhase ? phaseMappings[item.checklistPhase] : null) ||
        (item.checklistOwnerRole ? mappings[item.checklistOwnerRole] : null);
      if (!assigneeId || assigneeId === item.assigneeId) continue;
      await this.ensureEligibleProductAssignee(projectId, assigneeId, item.id);

      const status = await this.resolveAssignmentStatus(item.id, assigneeId);
      const updated = await this.prisma.task.update({
        where: { id: item.id },
        data: { assigneeId, ...(!item.assigneeId && ['UNASSIGNED', 'TODO', 'READY'].includes(item.status) ? { status } : {}) },
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

  private async ensureManagementScope(projectId: string, actorId: string, actorRole?: UserRole) {
    if (actorRole === UserRole.OWNER) return;
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null, projectManagerId: actorId }, select: { id: true } });
    if (!project) throw new ForbiddenException('You are not authorized to manage this Product');
  }

  private async ensureActiveProductMember(projectId: string, userId: string) {
    const member = await this.prisma.projectMember.findFirst({
      where: { projectId, userId, user: { isActive: true, deletedAt: null } },
      select: { id: true },
    });
    if (!member) {
      throw new BadRequestException({
        code: 'INVALID_PRODUCT_ASSIGNEE',
        message: 'Select an active user who belongs to this Product Team.',
      });
    }
  }

  private async ensureEligibleProductAssignee(
    projectId: string,
    userId: string,
    taskId?: string,
  ) {
    const member = await this.prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        user: { globalRole: { in: [UserRole.TEAM_MEMBER, UserRole.ADMIN, UserRole.OWNER] }, isActive: true, deletedAt: null },
      },
      include: { projectRoles: true },
    });

    if (!member) {
      throw new BadRequestException({
        code: "INVALID_PRODUCT_ASSIGNEE",
        message: "Select an active user who belongs to this Product Team.",
      });
    }
    if (taskId) {
      const task = await this.prisma.task.findFirst({ where: { id: taskId, projectId }, include: { checklistTemplateItem: { include: { eligibleRoles: true } } } });
      if (!task) throw new NotFoundException('Work item not found');
      const eligibleIds = task.checklistTemplateItem?.eligibleRoles.map((link) => link.functionalRoleId) || [];
      if (!eligibleIds.length || !member.projectRoles.some((link) => eligibleIds.includes(link.functionalRoleId))) throw new BadRequestException({ code: 'ASSIGNEE_ROLE_MISMATCH', message: 'This Product member does not have an eligible Project Role for the work.' });
    }
  }

  private async validateProjectRolesForUser(userId: string, functionalRoleIds: string[]) {
    const ids = [...new Set(functionalRoleIds)];
    if (ids.length !== functionalRoleIds.length || ids.length > 20) throw new BadRequestException('Invalid Project roles');
    const count = await this.prisma.userFunctionalRole.count({ where: { userId, functionalRoleId: { in: ids }, functionalRole: { isActive: true } } });
    if (count !== ids.length) throw new BadRequestException('Project Roles must be selected from the user’s active Functional Roles');
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
      where: { projectId, workstream: "DEVELOPMENT", deletedAt: null },
      select: {
        status: true,
        progress: true,
        workType: true,
        workstream: true,
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
