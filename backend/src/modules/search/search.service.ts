import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@futurex/shared';
import { projectScope, taskScope } from '../../common/security/access-policy';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async searchAll(query: string, user: { id: string; globalRole: UserRole }) {
    if (!query || query.trim().length === 0) {
      return { tasks: [], projects: [], users: [], milestones: [] };
    }

    const s = query.trim().slice(0, 200);

    const [tasks, projects, users, milestones] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          ...taskScope(user),
          OR: [
            { title: { contains: s, mode: 'insensitive' } },
            { humanId: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
          ],
        },
        include: {
          project: { select: { id: true, key: true, name: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        take: 10,
      }),
      this.prisma.project.findMany({
        where: {
          ...projectScope(user),
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { key: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
          ],
        },
        include: {
          projectManager: { select: { id: true, firstName: true, lastName: true } },
        },
        take: 5,
      }),
      this.prisma.user.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          ...(user.globalRole === UserRole.TEAM_MEMBER ? { id: user.id } : {}),
          OR: [
            { firstName: { contains: s, mode: 'insensitive' } },
            { lastName: { contains: s, mode: 'insensitive' } },
            { email: { contains: s, mode: 'insensitive' } },
            { jobTitle: { contains: s, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          jobTitle: true,
          globalRole: true,
        },
        take: 5,
      }),
      this.prisma.milestone.findMany({
        where: {
          project: projectScope(user),
          OR: [
            { name: { contains: s, mode: 'insensitive' } },
            { description: { contains: s, mode: 'insensitive' } },
          ],
        },
        include: {
          project: { select: { id: true, key: true, name: true } },
        },
        take: 5,
      }),
    ]);

    return {
      query: s,
      tasks: tasks.map((t) => ({
        id: t.id,
        humanId: t.humanId,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectId: t.projectId,
        projectName: t.project.name,
        projectKey: t.project.key,
        assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : 'Unassigned',
      })),
      projects: projects.map((p) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        status: p.status,
        health: p.health,
        progress: p.progress,
        managerName: p.projectManager
          ? `${p.projectManager.firstName} ${p.projectManager.lastName}`
          : 'Unassigned',
      })),
      users: users.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        jobTitle: u.jobTitle,
        avatarUrl: u.avatarUrl,
        globalRole: u.globalRole,
      })),
      milestones: milestones.map((m) => ({
        id: m.id,
        name: m.name,
        targetDate: m.targetDate.toISOString(),
        status: m.status,
        projectId: m.projectId,
        projectName: m.project.name,
      })),
    };
  }
}
