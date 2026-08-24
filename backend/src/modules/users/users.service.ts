import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { UserRole, AuditAction } from '@futurex/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { search?: string; role?: UserRole; teamId?: string; isActive?: boolean }) {
    const where: any = { deletedAt: null };

    if (params?.search) {
      const search = params.search.trim();
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (params?.role) {
      where.globalRole = params.role;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.teamId) {
      where.teamMemberships = {
        some: { teamId: params.teamId },
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      include: {
        teamMemberships: {
          include: { team: true },
        },
        projectMemberships: true,
        assignedTasks: {
          where: {
            deletedAt: null,
            status: { notIn: ['DONE', 'CANCELED'] },
          },
          select: {
            id: true,
            status: true,
            estimatedHours: true,
          },
        },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return users.map((u) => {
      const activeTasksCount = u.assignedTasks.length;
      const blockedTasksCount = u.assignedTasks.filter((t) => t.status === 'BLOCKED').length;
      const estimatedWorkloadHours = u.assignedTasks.reduce(
        (sum, t) => sum + (t.estimatedHours || 0),
        0,
      );

      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        jobTitle: u.jobTitle,
        avatarUrl: u.avatarUrl,
        globalRole: u.globalRole as UserRole,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        teams: u.teamMemberships.map((tm) => ({
          id: tm.team.id,
          name: tm.team.name,
        })),
        assignedProjectsCount: u.projectMemberships.length,
        activeTasksCount,
        blockedTasksCount,
        estimatedWorkloadHours,
      };
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: {
        teamMemberships: {
          include: { team: true },
        },
        projectMemberships: {
          include: {
            project: {
              select: { id: true, key: true, name: true, status: true },
            },
          },
        },
        assignedTasks: {
          where: { deletedAt: null },
          select: {
            id: true,
            humanId: true,
            title: true,
            status: true,
            priority: true,
            progress: true,
            dueDate: true,
            estimatedHours: true,
            project: { select: { id: true, key: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle,
      avatarUrl: user.avatarUrl,
      globalRole: user.globalRole as UserRole,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      teams: user.teamMemberships.map((tm) => ({
        id: tm.team.id,
        name: tm.team.name,
      })),
      projects: user.projectMemberships.map((pm) => ({
        id: pm.project.id,
        key: pm.project.key,
        name: pm.project.name,
        role: pm.role,
      })),
      tasks: user.assignedTasks,
    };
  }

  async create(dto: CreateUserDto, actorId: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new BadRequestException('A user with this email address already exists');
    }

    const defaultPassword = dto.password || 'FutureX2026!@#';
    const passwordHash = await argon2.hash(defaultPassword);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        jobTitle: dto.jobTitle?.trim(),
        avatarUrl: dto.avatarUrl?.trim(),
        globalRole: dto.globalRole,
        teamMemberships: dto.teamIds?.length
          ? {
              create: dto.teamIds.map((teamId) => ({ teamId })),
            }
          : undefined,
      },
      include: {
        teamMemberships: {
          include: { team: true },
        },
      },
    });

    await this.recordAudit(actorId, AuditAction.USER_CREATED, 'User', user.id, {
      email: user.email,
      role: user.globalRole,
    });

    return this.findById(user.id);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string, actorRole: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Owner protection: Lower roles cannot demote or edit Owner
    if (user.globalRole === UserRole.OWNER && actorRole !== UserRole.OWNER && id !== actorId) {
      throw new ForbiddenException('Owner account cannot be modified by other users');
    }

    // Update team memberships if provided
    if (dto.teamIds !== undefined) {
      await this.prisma.teamMember.deleteMany({
        where: { userId: id },
      });

      if (dto.teamIds.length > 0) {
        await this.prisma.teamMember.createMany({
          data: dto.teamIds.map((teamId) => ({ userId: id, teamId })),
        });
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName !== undefined ? dto.firstName.trim() : undefined,
        lastName: dto.lastName !== undefined ? dto.lastName.trim() : undefined,
        jobTitle: dto.jobTitle !== undefined ? dto.jobTitle?.trim() : undefined,
        avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl?.trim() : undefined,
        globalRole: dto.globalRole !== undefined ? dto.globalRole : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
    });

    await this.recordAudit(actorId, AuditAction.USER_UPDATED, 'User', id, dto);

    return this.findById(updated.id);
  }

  async toggleActive(id: string, isActive: boolean, actorId: string, actorRole: UserRole) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.globalRole === UserRole.OWNER) {
      throw new ForbiddenException('Owner account cannot be deactivated');
    }

    await this.prisma.user.update({
      where: { id },
      data: { isActive },
    });

    if (!isActive) {
      // Revoke all sessions
      await this.prisma.session.updateMany({
        where: { userId: id },
        data: { isRevoked: true },
      });
    }

    await this.recordAudit(
      actorId,
      isActive ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
      'User',
      id,
    );

    return { success: true, message: `User ${isActive ? 'activated' : 'deactivated'} successfully` };
  }

  async resetPassword(id: string, newPassword: string, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    // Revoke sessions
    await this.prisma.session.updateMany({
      where: { userId: id },
      data: { isRevoked: true },
    });

    await this.recordAudit(actorId, AuditAction.PASSWORD_RESET, 'User', id);

    return { success: true, message: 'Password reset successfully' };
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
