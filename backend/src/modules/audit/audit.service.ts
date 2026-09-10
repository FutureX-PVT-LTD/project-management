import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@futurex/shared';
import { IDLE_MS } from '../auth/session-policy';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    action?: string;
    actorId?: string;
    entityType?: string;
    search?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    outcome?: 'success' | 'failed';
  }) {
    const where: any = {};

    if (params?.action) where.action = params.action;
    if (params?.actorId) where.actorId = params.actorId;
    if (params?.entityType) where.entityType = params.entityType;
    if (params?.outcome) where.AND = [params.outcome === 'failed'
      ? { action: { endsWith: '_FAILED' } } : { NOT: { action: { endsWith: '_FAILED' } } }];
    if (params?.startDate || params?.endDate) {
      const start = new Date(params.startDate || '');
      const end = new Date(params.endDate || '');
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
          end < start || end.getTime() - start.getTime() > 366 * 86400000) {
        throw new BadRequestException('Provide a valid date range of at most one year');
      }
      where.createdAt = { gte: start, lte: end };
    }

    if (params?.search) {
      const s = params.search.trim();
      where.OR = [
        { entityType: { contains: s, mode: 'insensitive' } },
        { detailsJson: { contains: s, mode: 'insensitive' } },
        { ipAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              globalRole: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Number.isFinite(params?.limit) ? Math.min(100, Math.max(1, Math.trunc(params.limit))) : 50,
        skip: Number.isFinite(params?.offset) ? Math.min(100000, Math.max(0, Math.trunc(params.offset))) : 0,
      }),
    ]);

    return {
      total,
      logs: logs.map((l) => ({
        id: l.id,
        actorId: l.actorId,
        actor: l.actor,
        action: l.action as AuditAction,
        entityType: l.entityType,
        entityId: l.entityId,
        ipAddress: l.ipAddress,
        userAgent: l.userAgent,
        detailsJson: l.detailsJson,
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }

  async ownLoginHistory(userId: string) {
    return this.prisma.auditLog.findMany({
      where: { actorId: userId, action: { in: ['USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT', 'SESSION_REVOKED'] } },
      select: { id: true, action: true, createdAt: true, ipAddress: true, userAgent: true },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
  }

  async ownSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId },
      select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, isRevoked: true },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
  }

  async dashboardSummary() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const [recent, successfulLoginsToday, failedLoginsToday, activeSessions] = await Promise.all([
      this.prisma.auditLog.findMany({
        select: {
          id: true, action: true, entityType: true, entityId: true, createdAt: true,
          actor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' }, take: 8,
      }),
      this.prisma.auditLog.count({ where: { action: 'USER_LOGIN', createdAt: { gte: startOfDay } } }),
      this.prisma.auditLog.count({ where: { action: 'USER_LOGIN_FAILED', createdAt: { gte: startOfDay } } }),
      this.prisma.session.count({ where: {
        isRevoked: false, expiresAt: { gt: now }, lastSeenAt: { gt: new Date(now.getTime() - IDLE_MS) },
      } }),
    ]);
    return { recent, security: { successfulLoginsToday, failedLoginsToday, activeSessions } };
  }

  async log(
    actorId: string | null,
    action: AuditAction,
    entityType: string,
    entityId?: string | null,
    ipAddress?: string | null,
    userAgent?: string | null,
    details?: Record<string, any>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId: entityId || undefined,
        ipAddress: ipAddress || undefined,
        userAgent: userAgent || undefined,
        detailsJson: details ? JSON.stringify(details) : undefined,
      },
    });
  }
}
