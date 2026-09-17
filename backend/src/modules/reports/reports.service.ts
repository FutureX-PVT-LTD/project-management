import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProjectStatus,
  ProjectHealth,
  TaskStatus,
  TaskPriority,
  UserRole,
} from '@futurex/shared';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getOwnerDashboardData() {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const [projects, tasks, users] = await Promise.all([
      this.prisma.project.findMany({
        where: { deletedAt: null, lifecycleStatus: { not: 'DRAFT' } },
        include: {
          projectManager: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  globalRole: true,
                },
              },
            },
          },
          milestones: { orderBy: { orderIndex: 'asc' } },
          tasks: {
            where: { deletedAt: null },
            select: { id: true, status: true, priority: true, dueDate: true, humanId: true, title: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.task.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          humanId: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          projectId: true,
          isManualBlocked: true,
          manualBlockReason: true,
          project: { select: { id: true, key: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          createdAt: true,
        },
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true },
      }),
    ]);

    const activeProjects = projects.filter((p) => p.status === ProjectStatus.ACTIVE);
    const onTrackProjects = activeProjects.filter((p) => p.health === ProjectHealth.ON_TRACK);
    const atRiskProjects = activeProjects.filter((p) => p.health === ProjectHealth.AT_RISK);
    const offTrackProjects = activeProjects.filter((p) => p.health === ProjectHealth.OFF_TRACK);
    const completedProjects = projects.filter((p) => p.status === ProjectStatus.COMPLETED);

    const activeTasks = tasks.filter((t) => t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED);
    const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE);
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE && t.status !== TaskStatus.CANCELED,
    );
    const blockedTasks = tasks.filter((t) => t.status === TaskStatus.BLOCKED);
    const tasksDueThisWeek = tasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= weekFromNow &&
        t.status !== TaskStatus.DONE,
    );

    // Needs attention items (Requirement #16)
    const needsAttention: {
      type: 'OVERDUE' | 'BLOCKED' | 'AT_RISK' | 'MILESTONE_DELAY';
      title: string;
      subtitle: string;
      projectKey: string;
      projectId: string;
      taskId?: string;
    }[] = [];

    // Overdue urgent tasks
    overdueTasks
      .filter((t) => ['URGENT', 'HIGH'].includes(t.priority))
      .slice(0, 4)
      .forEach((t) => {
        needsAttention.push({
          type: 'OVERDUE',
          title: `${t.humanId} is overdue (${t.priority} Priority)`,
          subtitle: `"${t.title}" assigned to ${t.assignee ? t.assignee.firstName + ' ' + t.assignee.lastName : 'Unassigned'}`,
          projectKey: t.project.key,
          projectId: t.projectId,
          taskId: t.id,
        });
      });

    // Blocked tasks
    blockedTasks.slice(0, 3).forEach((t) => {
      needsAttention.push({
        type: 'BLOCKED',
        title: `${t.humanId} is currently blocked`,
        subtitle: t.isManualBlocked
          ? `Reason: ${t.manualBlockReason || 'Manual block'}`
          : `Waiting on prerequisite dependency`,
        projectKey: t.project.key,
        projectId: t.projectId,
        taskId: t.id,
      });
    });

    // At risk projects
    atRiskProjects.forEach((p) => {
      needsAttention.push({
        type: 'AT_RISK',
        title: `Project ${p.name} is At Risk`,
        subtitle: p.healthReason || 'Requires Admin review',
        projectKey: p.key,
        projectId: p.id,
      });
    });

    return {
      metrics: {
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        onTrackProjects: onTrackProjects.length,
        atRiskProjects: atRiskProjects.length,
        offTrackProjects: offTrackProjects.length,
        completedProjects: completedProjects.length,
        totalTasks: tasks.length,
        activeTasks: activeTasks.length,
        completedTasks: completedTasks.length,
        overdueTasks: overdueTasks.length,
        blockedTasks: blockedTasks.length,
        tasksDueThisWeek: tasksDueThisWeek.length,
        totalUsers: users.length,
      },
      portfolio: projects.map((p) => {
        const curMilestone = p.milestones.find((m) => m.status !== 'COMPLETED') || p.milestones[0];
        const visibleMembers = p.members.filter(
          (m) => m.userId !== p.projectManager?.id && m.user?.globalRole === UserRole.TEAM_MEMBER,
        );
        const pTasks = p.tasks;
        const pDone = pTasks.filter((t) => t.status === TaskStatus.DONE).length;
        const pBlocked = pTasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
        const pOverdue = pTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE,
        ).length;

        return {
          id: p.id,
          key: p.key,
          name: p.name,
          status: p.status,
          health: p.health,
          healthReason: p.healthReason,
          progress: p.progress,
          projectManagerName: p.projectManager
            ? `${p.projectManager.firstName} ${p.projectManager.lastName}`
            : 'Unassigned',
          projectManagerAvatar: p.projectManager?.avatarUrl,
          membersCount: visibleMembers.length,
          currentMilestoneName: curMilestone?.name,
          targetDate: p.targetDate ? p.targetDate.toISOString() : null,
          totalTasks: pTasks.length,
          completedTasks: pDone,
          blockedTasks: pBlocked,
          overdueTasks: pOverdue,
        };
      }),
      needsAttention,
    };
  }

  async getPMDashboardData(pmUserId: string) {
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const managedProjects = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        lifecycleStatus: { not: 'DRAFT' },
        OR: [{ projectManagerId: pmUserId }, { members: { some: { userId: pmUserId } } }],
      },
      include: {
        projectManager: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
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
                assignedTasks: {
                  where: { deletedAt: null, status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] } },
                  select: { id: true, humanId: true, title: true, status: true, progress: true, estimatedHours: true, dueDate: true },
                },
              },
            },
          },
        },
        milestones: { orderBy: { orderIndex: 'asc' } },
        tasks: {
          where: { deletedAt: null },
          include: {
            assignee: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });

    const allTasks = managedProjects.flatMap((p) => p.tasks);
    const overdueTasks = allTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE,
    );
    const blockedTasks = allTasks.filter((t) => t.status === TaskStatus.BLOCKED);
    const waitingTasks = allTasks.filter((t) => t.status === TaskStatus.WAITING);
    const awaitingReviewTasks = allTasks.filter((t) => t.status === TaskStatus.IN_REVIEW);
    const dueThisWeekTasks = allTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) >= now &&
        new Date(t.dueDate) <= weekFromNow &&
        t.status !== TaskStatus.DONE,
    );

    // Needs attention items
    const needsAttention: {
      id: string;
      title: string;
      reason: string;
      type: 'BLOCKED' | 'OVERDUE' | 'REVIEW' | 'MILESTONE';
      projectId: string;
      projectKey: string;
      taskId?: string;
      projectName?: string;
      assigneeName?: string;
      priority?: string;
      progress?: number;
      dueDate?: string | null;
    }[] = [];

    awaitingReviewTasks.forEach((t) => {
      const project = managedProjects.find((p) => p.id === t.projectId);
      needsAttention.push({
        id: `rev-${t.id}`,
        title: `${t.humanId}: ${t.title}`,
        reason: `Review ${t.progress}% progress from ${
          t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned'
        }`,
        type: 'REVIEW',
        projectId: t.projectId,
        projectKey: project?.key || t.humanId.split('-')[0],
        taskId: t.id,
        projectName: project?.name,
        assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned',
        priority: t.priority,
        progress: t.progress,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      });
    });

    overdueTasks.slice(0, 4).forEach((t) => {
      needsAttention.push({
        id: `ovr-${t.id}`,
        title: `${t.humanId}: ${t.title}`,
        reason: `Overdue since ${new Date(t.dueDate!).toLocaleDateString()}`,
        type: 'OVERDUE',
        projectId: t.projectId,
        projectKey: t.humanId.split('-')[0],
        taskId: t.id,
      });
    });

    blockedTasks.slice(0, 4).forEach((t) => {
      needsAttention.push({
        id: `blk-${t.id}`,
        title: `${t.humanId}: ${t.title}`,
        reason: t.isManualBlocked
          ? `Manual blocker: ${t.manualBlockReason}`
          : `Waiting for prerequisite task`,
        type: 'BLOCKED',
        projectId: t.projectId,
        projectKey: t.humanId.split('-')[0],
        taskId: t.id,
      });
    });

    // Workload aggregation
    const memberWorkloadMap = new Map<string, any>();
    managedProjects.forEach((p) => {
      p.members
        .filter((m) => m.userId !== p.projectManagerId && m.user?.globalRole === UserRole.TEAM_MEMBER)
        .forEach((m) => {
        if (!memberWorkloadMap.has(m.user.id)) {
          const activeTasks = m.user.assignedTasks.length;
          const blocked = m.user.assignedTasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
          const waiting = m.user.assignedTasks.filter((t) => t.status === TaskStatus.WAITING).length;
          const inProgress = m.user.assignedTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length;
          const hours = m.user.assignedTasks.reduce(
            (sum, t) => sum + (t.estimatedHours || 0),
            0,
          );

          const currentTask = m.user.assignedTasks.find((t) => t.status === TaskStatus.IN_PROGRESS)
            || m.user.assignedTasks.find((t) => t.status === TaskStatus.READY)
            || m.user.assignedTasks.find((t) => t.status === TaskStatus.WAITING)
            || m.user.assignedTasks[0]
            || null;

          memberWorkloadMap.set(m.user.id, {
            user: {
              id: m.user.id,
              firstName: m.user.firstName,
              lastName: m.user.lastName,
              avatarUrl: m.user.avatarUrl,
              jobTitle: m.user.jobTitle,
            },
            assignedTasksCount: activeTasks,
            blockedTasksCount: blocked,
            waitingTasksCount: waiting,
            inProgressTasksCount: inProgress,
            allocatedHours: hours,
            currentTask: currentTask ? {
              id: currentTask.id,
              humanId: currentTask.humanId,
              title: currentTask.title,
              status: currentTask.status,
              progress: currentTask.progress,
            } : null,
          });
        }
      });
    });

    const managedProjectIds = managedProjects.map((p) => p.id);
    const recentActivities = await this.prisma.taskActivity.findMany({
      where: {
        projectId: { in: managedProjectIds },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        task: { select: { id: true, humanId: true, title: true } },
        project: { select: { id: true, key: true, name: true } },
      },
    });

    return {
      metrics: {
        managedProjectsCount: managedProjects.length,
        totalTasksCount: allTasks.length,
        overdueCount: overdueTasks.length,
        blockedCount: blockedTasks.length,
        waitingCount: waitingTasks.length,
        awaitingReviewCount: awaitingReviewTasks.length,
        dueThisWeekCount: dueThisWeekTasks.length,
      },
      projects: managedProjects.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        health: p.health,
        healthReason: p.healthReason,
        progress: p.progress,
        status: p.status,
        targetDate: p.targetDate ? p.targetDate.toISOString() : null,
        tasksCount: p.tasks.length,
        completedTasksCount: p.tasks.filter((t) => t.status === TaskStatus.DONE).length,
        inProgressTasksCount: p.tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
        inReviewTasksCount: p.tasks.filter((t) => t.status === TaskStatus.IN_REVIEW).length,
        waitingTasksCount: p.tasks.filter((t) => t.status === TaskStatus.WAITING).length,
        blockedTasksCount: p.tasks.filter((t) => t.status === TaskStatus.BLOCKED).length,
        membersCount: p.members.length,
        overdueTasksCount: p.tasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.DONE,
        ).length,
        tasks: p.tasks.map((t) => ({
          id: t.id,
          humanId: t.humanId,
          title: t.title,
          status: t.status,
          priority: t.priority,
          progress: t.progress,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          assignee: t.assignee,
        })),
        milestones: p.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          progress: m.progress,
          targetDate: m.targetDate ? m.targetDate.toISOString() : null,
        })),
      })),
      needsAttention,
      teamWorkload: Array.from(memberWorkloadMap.values()),
      recentActivities,
    };
  }

  async getReportsData() {
    const now = new Date();

    const [projects, tasks, users, milestones] = await Promise.all([
      this.prisma.project.findMany({
        where: { deletedAt: null, lifecycleStatus: { not: 'DRAFT' } },
        include: {
          projectManager: { select: { firstName: true, lastName: true } },
          tasks: {
            where: { deletedAt: null },
            select: { id: true, status: true, priority: true, estimatedHours: true },
          },
        },
      }),
      this.prisma.task.findMany({
        where: { deletedAt: null },
        include: {
          project: { select: { key: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, jobTitle: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { deletedAt: null, isActive: true },
        include: {
          assignedTasks: {
            where: { deletedAt: null, status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELED] } },
            select: { id: true, status: true, estimatedHours: true, dueDate: true },
          },
        },
      }),
      this.prisma.milestone.findMany({
        include: {
          project: { select: { key: true, name: true } },
          tasks: { where: { deletedAt: null }, select: { id: true, status: true } },
        },
        orderBy: { targetDate: 'asc' },
      }),
    ]);

    // Status distribution
    const statusCounts: Record<string, number> = {};
    Object.values(TaskStatus).forEach((st) => (statusCounts[st] = 0));
    tasks.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    const statusDistribution = Object.keys(statusCounts).map((status) => ({
      status: status as TaskStatus,
      count: statusCounts[status],
      percentage: tasks.length > 0 ? Math.round((statusCounts[status] / tasks.length) * 100) : 0,
    }));

    // Priority distribution
    const priorityCounts: Record<string, number> = {};
    Object.values(TaskPriority).forEach((pr) => (priorityCounts[pr] = 0));
    tasks.forEach((t) => {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
    });

    const priorityDistribution = Object.keys(priorityCounts).map((priority) => ({
      priority: priority as TaskPriority,
      count: priorityCounts[priority],
    }));

    // Workload by user
    const userWorkload = users.map((u) => {
      const activeTasks = u.assignedTasks.length;
      const blocked = u.assignedTasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
      const dueSoon = u.assignedTasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= new Date(Date.now() + 3 * 86400000),
      ).length;
      const hours = u.assignedTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

      let capacityLevel: 'AVAILABLE' | 'BALANCED' | 'HIGH' = 'BALANCED';
      if (hours < 15) capacityLevel = 'AVAILABLE';
      else if (hours > 35) capacityLevel = 'HIGH';

      return {
        userId: u.id,
        userName: `${u.firstName} ${u.lastName}`,
        userEmail: u.email,
        avatarUrl: u.avatarUrl,
        jobTitle: u.jobTitle,
        activeTasksCount: activeTasks,
        blockedTasksCount: blocked,
        dueSoonTasksCount: dueSoon,
        estimatedHours: hours,
        capacityLevel,
      };
    });

    // Milestone delivery
    const milestoneDelivery = milestones.map((m) => {
      const isDelayed = new Date(m.targetDate) < now && m.progress < 100;
      return {
        milestoneId: m.id,
        milestoneName: m.name,
        projectName: m.project.name,
        projectKey: m.project.key,
        targetDate: m.targetDate.toISOString(),
        progress: m.progress,
        isDelayed,
        totalTasks: m.tasks.length,
        completedTasks: m.tasks.filter((t) => t.status === TaskStatus.DONE).length,
      };
    });

    return {
      statusDistribution,
      priorityDistribution,
      userWorkload,
      milestoneDelivery,
      totalProjects: projects.length,
      totalTasks: tasks.length,
    };
  }
}
