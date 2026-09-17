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

  jobRoles() { return this.prisma.functionalRole.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] }); }

  async saveJobRole(id: string | undefined, dto: { code?: string; name?: string; category?: string; isActive?: boolean }, actorId: string) {
    const name = dto.name?.trim();
    if ((!id || dto.name !== undefined) && !name) throw new BadRequestException('Role name is required');
    const code = dto.code?.trim() || name?.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const category = dto.category || 'ENGINEERING';
    if (!id && !code) throw new BadRequestException('Role code is required');
    if (id && dto.isActive === false) {
      const [users, projectMembers, checklistItems] = await Promise.all([
        this.prisma.userFunctionalRole.count({ where: { functionalRoleId: id, user: { isActive: true } } }),
        this.prisma.projectMemberRoleAssignment.count({ where: { functionalRoleId: id } }),
        this.prisma.checklistEligibleRole.count({ where: { functionalRoleId: id, checklistTemplateItem: { isActive: true } } }),
      ]);
      if (users || projectMembers || checklistItems) throw new BadRequestException(`Role is still used by ${users} active users, ${projectMembers} Product members and ${checklistItems} checklist responsibilities`);
    }
    if (name && await this.prisma.functionalRole.findFirst({ where: { name: { equals: name, mode: 'insensitive' }, category, ...(id ? { id: { not: id } } : {}) } })) throw new BadRequestException('A role with this name already exists in this category');
    return this.prisma.$transaction(async (tx) => {
      const role = id ? await tx.functionalRole.update({ where: { id }, data: { name, category: dto.category, isActive: dto.isActive } }) : await tx.functionalRole.create({ data: { code: code!, name: name!, category } });
      await tx.auditLog.create({ data: { actorId, action: id ? 'FUNCTIONAL_ROLE_UPDATED' : 'FUNCTIONAL_ROLE_CREATED', entityType: 'FunctionalRole', entityId: role.id, detailsJson: JSON.stringify({ code: role.code, name: role.name, category: role.category, isActive: role.isActive }) } });
      return role;
    });
  }

  private async validateJobRoles(ids?: string[], userId?: string) {
    if (ids === undefined) return;
    if (!Array.isArray(ids) || ids.length > 30) throw new BadRequestException('Invalid job roles');
    const unique = [...new Set(ids)];
    if (unique.length !== ids.length || await this.prisma.functionalRole.count({ where: { id: { in: unique }, OR: [{ isActive: true }, ...(userId ? [{ users: { some: { userId } } }] : [])] } }) !== unique.length) throw new BadRequestException('Choose active functional roles');
  }

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
        functionalRoleLinks: { include: { functionalRole: true } },
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
      functionalRoles: u.functionalRoleLinks.map((link) => link.functionalRole),
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
        functionalRoleLinks: { include: { functionalRole: true } },
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
      functionalRoles: user.functionalRoleLinks.map((link) => link.functionalRole),
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
    if (dto.globalRole === UserRole.TEAM_MEMBER && !dto.functionalRoleIds?.length) {
      throw new BadRequestException('Choose at least one functional role for a Team Member');
    }
    const defaultPassword = dto.password;
    await this.validateJobRoles(dto.functionalRoleIds);
    const passwordHash = await argon2.hash(defaultPassword);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        jobTitle: dto.jobTitle?.trim(),
        functionalRoleLinks: dto.functionalRoleIds ? { create: dto.functionalRoleIds.map((functionalRoleId) => ({ functionalRoleId })) } : undefined,
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
    for (const functionalRoleId of dto.functionalRoleIds || []) {
      await this.recordAudit(actorId, 'USER_FUNCTIONAL_ROLE_ADDED' as AuditAction, 'User', user.id, { functionalRoleId }, auditContext);
    }

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
      where: { id, deletedAt: null },
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

    const effectiveRole = dto.globalRole ?? (user.globalRole as UserRole);
    if (effectiveRole === UserRole.TEAM_MEMBER && dto.functionalRoleIds?.length === 0) {
      throw new BadRequestException('Choose at least one functional role for a Team Member');
    }

    await this.validateJobRoles(dto.functionalRoleIds, id);
    const previousFunctionalRoleIds = dto.functionalRoleIds === undefined ? [] : (await this.prisma.userFunctionalRole.findMany({ where: { userId: id }, select: { functionalRoleId: true } })).map((row) => row.functionalRoleId);
    const updated = await this.prisma.$transaction(async (tx) => {
    if (dto.teamIds !== undefined) {
      await tx.teamMember.deleteMany({
        where: { userId: id },
      });

      if (dto.teamIds.length > 0) {
        await tx.teamMember.createMany({
          data: dto.teamIds.map((teamId) => ({ userId: id, teamId })),
        });
      }
    }

      const result = await tx.user.update({
        where: { id },
        data: {
          firstName: dto.firstName !== undefined ? dto.firstName.trim() : undefined,
          lastName: dto.lastName !== undefined ? dto.lastName.trim() : undefined,
          jobTitle: dto.jobTitle !== undefined ? dto.jobTitle?.trim() : undefined,
          functionalRoleLinks: dto.functionalRoleIds !== undefined ? { deleteMany: {}, create: dto.functionalRoleIds.map((functionalRoleId) => ({ functionalRoleId })) } : undefined,
          avatarUrl: dto.avatarUrl !== undefined ? dto.avatarUrl?.trim() : undefined,
          globalRole: dto.globalRole !== undefined ? dto.globalRole : undefined,
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
        },
      });

      if (dto.globalRole !== undefined || dto.isActive !== undefined) {
        await tx.session.updateMany({ where: { userId: id }, data: { isRevoked: true } });
      }
      if (dto.functionalRoleIds !== undefined) {
        for (const functionalRoleId of dto.functionalRoleIds.filter((roleId) => !previousFunctionalRoleIds.includes(roleId))) await tx.auditLog.create({ data: { actorId, action: 'USER_FUNCTIONAL_ROLE_ADDED', entityType: 'User', entityId: id, detailsJson: JSON.stringify({ functionalRoleId }) } });
        for (const functionalRoleId of previousFunctionalRoleIds.filter((roleId) => !dto.functionalRoleIds!.includes(roleId))) await tx.auditLog.create({ data: { actorId, action: 'USER_FUNCTIONAL_ROLE_REMOVED', entityType: 'User', entityId: id, detailsJson: JSON.stringify({ functionalRoleId }) } });
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
      where: { id, deletedAt: null },
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

  async remove(id: string, actorId: string, auditContext?: AuditContext) {
    if (id === actorId) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true, globalRole: true, isActive: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.globalRole === UserRole.OWNER) {
      throw new ForbiddenException('Super Admin accounts cannot be deleted');
    }
    if (user.isActive) {
      throw new BadRequestException('Deactivate this account before deleting it');
    }

    const released = await this.prisma.$transaction(async (tx) => {
      const [tasks, managedProjects, marketingProjects, phases, phaseMembers, channels, content, buzz, signoffs] = await Promise.all([
        tx.task.updateMany({
          where: { assigneeId: id, deletedAt: null, status: { notIn: ['DONE', 'CANCELED'] } },
          data: { assigneeId: null },
        }),
        tx.project.updateMany({ where: { projectManagerId: id, deletedAt: null }, data: { projectManagerId: null } }),
        tx.project.updateMany({ where: { marketingOwnerId: id, deletedAt: null }, data: { marketingOwnerId: null } }),
        tx.projectPhaseAssignment.updateMany({ where: { defaultAssigneeId: id }, data: { defaultAssigneeId: null } }),
        tx.projectPhaseMember.deleteMany({ where: { userId: id } }),
        tx.marketingChannel.updateMany({ where: { backupAdminId: id }, data: { backupAdminId: null } }),
        tx.marketingContentItem.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
        tx.marketingBuzzActivity.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
        tx.marketingSignoffItem.updateMany({ where: { ownerId: id }, data: { ownerId: null } }),
      ]);

      await tx.projectMember.deleteMany({ where: { userId: id } });
      await tx.teamMember.deleteMany({ where: { userId: id } });
      await tx.session.updateMany({ where: { userId: id, isRevoked: false }, data: { isRevoked: true } });
      await tx.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          resetPasswordToken: null,
          resetPasswordExpires: null,
        },
      });

      const summary = {
        tasks: tasks.count,
        projectOwnerships: managedProjects.count + marketingProjects.count,
        phaseAssignments: phases.count + phaseMembers.count,
        marketingAssignments: channels.count + content.count + buzz.count + signoffs.count,
      };
      await tx.auditLog.create({
        data: {
          actorId,
          action: AuditAction.USER_DELETED,
          entityType: 'User',
          entityId: id,
          ipAddress: auditContext?.ipAddress,
          userAgent: auditContext?.userAgent,
          detailsJson: JSON.stringify({ affectedEmail: user.email, released: summary }),
        },
      });
      return summary;
    });

    return {
      success: true,
      message: 'User deleted successfully. Historical activity and audit records were preserved.',
      released,
    };
  }

  async resetPassword(
    id: string,
    newPassword: string,
    actorId: string,
    actorRole: UserRole,
    auditContext?: AuditContext,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: null },
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
