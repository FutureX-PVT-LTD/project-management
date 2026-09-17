import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { UserRole } from '@futurex/shared';
import { PrismaService } from '../../modules/prisma/prisma.service';

export type Actor = { id: string; globalRole: UserRole };
export const publicUserSelect = {
  id: true, firstName: true, lastName: true, avatarUrl: true,
  jobTitle: true, globalRole: true,
} as const;

export function projectScope(actor: Actor): Prisma.ProjectWhereInput {
  return {
    deletedAt: null,
    lifecycleStatus: { not: 'DRAFT' },
    ...(actor.globalRole === UserRole.TEAM_MEMBER
      ? { members: { some: { userId: actor.id } } } : {}),
  };
}

export function taskScope(actor: Actor): Prisma.TaskWhereInput {
  return {
    deletedAt: null,
    project: projectScope(actor),
    ...(actor.globalRole === UserRole.TEAM_MEMBER ? { assigneeId: actor.id } : {}),
  };
}

export async function requireProject(prisma: PrismaService, id: string, actor: Actor) {
  if (!id || typeof id !== 'string') throw new NotFoundException('Project not found');
  const project = await prisma.project.findFirst({ where: { AND: [{ id }, projectScope(actor)] } });
  if (!project) throw new NotFoundException('Project not found');
  return project;
}

export async function requireTask(prisma: PrismaService, id: string, actor: Actor) {
  if (!id || typeof id !== 'string') throw new NotFoundException('Task not found');
  const task = await prisma.task.findFirst({ where: { AND: [{ id }, taskScope(actor)] } });
  if (!task) throw new NotFoundException('Task not found');
  return task;
}

export function requireManager(role: UserRole) {
  if (role !== UserRole.ADMIN && role !== UserRole.OWNER) {
    throw new ForbiddenException('Management permission required');
  }
}
