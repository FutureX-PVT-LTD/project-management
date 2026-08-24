import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@futurex/shared';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: {
    action?: AuditAction;
    actorId?: string;
    entityType?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (params?.action) where.action = params.action;
    if (params?.actorId) where.actorId = params.actorId;
    if (params?.entityType) where.entityType = params.entityType;

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
        take: params?.limit || 50,
        skip: params?.offset || 0,
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
