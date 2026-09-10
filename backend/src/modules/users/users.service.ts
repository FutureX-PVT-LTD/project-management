import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/create-user.dto';
import { UserRole, AuditAction } from '@futurex/shared';
import * as argon2 from 'argon2';

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter?: {
    search?: string;
    role?: UserRole;
    teamId?: string;
    isActive?: boolean;
  }) {
    const where: any = { deletedAt: null };

    if (filter?.search) {
      where.OR = [
        { firstName: { contains: filter.search, mode: 'insensitive' } },
        { lastName: { contains: filter.search, mode: 'insensitive' } },
        { email: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter?.role) {
      where.globalRole = filter.role;
    }

    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    if (filter?.teamId) {
      where.teamMemberships = {
        some: { teamId: filter.teamId },
      };
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        avatarUrl: true,
        globalRole: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        teamMemberships: {
          select: {
            team: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: {
            assignedTasks: {
              where: { status: { notIn: ['DONE', 'CANCELED'] } },
            },
          },
        },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return users.map((u) => ({
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
      teams: u.teamMemberships.map((tm) => tm.team),
      activeTasksCount: u._count.assignedTasks,
    }));
  }

  async findDirectory(actorId: string) {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        jobTitle: true,
        avatarUrl: true,
        globalRole: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      jobTitle: u.jobTitle,
      avatarUrl: u.avatarUrl,
      globalRole: u.globalRole as UserRole,
      isActive: true,
      teams: [],
      activeTasksCount: 0,
    }));
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

  async getSecurity(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true, globalRole: true, isActive: true, lastLoginAt: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const [sessions, loginHistory] = await Promise.all([
      this.prisma.session.findMany({
        where: { userId: id },
        select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, isRevoked: true },
        orderBy: { lastSeenAt: 'desc' },
        take: 100,
      }),
      this.prisma.auditLog.findMany({
        where: { actorId: id, action: { in: ['USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT', 'SESSION_REVOKED'] } },
        select: { id: true, action: true, createdAt: true, ipAddress: true, userAgent: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return { user, sessions, loginHistory };
  }

  async revokeSession(userId: string, sessionId: string, actorId: string, auditContext?: AuditContext) {
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.session.updateMany({
        where: { id: sessionId, userId, isRevoked: false },
        data: { isRevoked: true },
      });
      if (!updated.count) throw new NotFoundException('Active session not found');
      await tx.auditLog.create({ data: {
        actorId, action: AuditAction.SESSION_REVOKED, entityType: 'Session', entityId: sessionId,
        ipAddress: auditContext?.ipAddress, userAgent: auditContext?.userAgent,
        detailsJson: JSON.stringify({ affectedUserId: userId, scope: 'single' }),
      } });
      return updated.count;
    });
    return { success: true, revokedCount: result };
  }

  async revokeAllSessions(userId: string, actorId: string, auditContext?: AuditContext) {
    const exists = await this.prisma.user.count({ where: { id: userId, deletedAt: null } });
    if (!exists) throw new NotFoundException('User not found');
    const count = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.session.updateMany({ where: { userId, isRevoked: false }, data: { isRevoked: true } });
      await tx.auditLog.create({ data: {
        actorId, action: AuditAction.SESSION_REVOKED, entityType: 'User', entityId: userId,
        ipAddress: auditContext?.ipAddress, userAgent: auditContext?.userAgent,
        detailsJson: JSON.stringify({ affectedUserId: userId, scope: 'all', revokedCount: updated.count }),
      } });
      return updated.count;
    });
    return { success: true, revokedCount: count };
  }

  async create(
    dto: CreateUserDto,
    actorId: string,
    actorRole: UserRole,
    auditContext?: AuditContext,
  ) {
    if (dto.globalRole === UserRole.OWNER && actorRole !== UserRole.OWNER) {
      throw new ForbiddenException('Only a Super Admin can create another Super Admin');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new BadRequestException('A user with this email address already exists');
    }

    if (!dto.password) throw new BadRequestException('An initial password is required');
    const defaultPassword = dto.password;
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

    await this.recordAudit(
      actorId,
      AuditAction.USER_CREATED,
      'User',
      user.id,
      {
        email: user.email,
        role: user.globalRole,
      },
      auditContext,
    );

    return this.findById(user.id);
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
    actorRole: UserRole,
    auditContext?: AuditContext,
  ) {
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

    if (dto.globalRole === UserRole.OWNER && actorRole !== UserRole.OWNER) {
      throw new ForbiddenException('Only a Super Admin can promote users to Super Admin');
    }

    if (
      user.globalRole === UserRole.OWNER &&
      dto.globalRole &&
      dto.globalRole !== UserRole.OWNER &&
      id === actorId
    ) {
      throw new ForbiddenException('Super Admin cannot demote their own account');
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

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
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

      if (dto.globalRole !== undefined || dto.isActive !== undefined) {
        await tx.session.updateMany({ where: { userId: id }, data: { isRevoked: true } });
      }
      return result;
    });

    await this.recordAudit(actorId, AuditAction.USER_UPDATED, 'User', id, dto, auditContext);

    return this.findById(updated.id);
  }

  async toggleActive(
    id: string,
    isActive: boolean,
    actorId: string,
    actorRole: UserRole,
    auditContext?: AuditContext,
  ) {
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
      undefined,
      auditContext,
    );

    return { success: true, message: `User ${isActive ? 'activated' : 'deactivated'} successfully` };
  }

  async resetPassword(
    id: string,
    newPassword: string,
    actorId: string,
    actorRole: UserRole,
    auditContext?: AuditContext,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.globalRole === UserRole.OWNER && actorRole !== UserRole.OWNER) {
      throw new ForbiddenException('Only a Super Admin may reset a Super Admin password');
    }
    const passwordHash = await argon2.hash(newPassword);

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { passwordHash, resetPasswordToken: null, resetPasswordExpires: null },
      });

      // Revoke sessions
      await tx.session.updateMany({
        where: { userId: id },
        data: { isRevoked: true },
      });
    });

    await this.recordAudit(actorId, AuditAction.PASSWORD_RESET, 'User', id, undefined, auditContext);

    return { success: true, message: 'Password reset successfully' };
  }

  private async recordAudit(
    actorId: string,
    action: AuditAction,
    entityType: string,
    entityId?: string,
    details?: Record<string, any>,
    auditContext?: AuditContext,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId,
          action,
          entityType,
          entityId,
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
          detailsJson: details ? JSON.stringify(details) : undefined,
        },
      });
    } catch (e) {
      // ignore
    }
  }
}
