import { AuditAction } from '../enums/audit.enum';
import { UserDto } from './user.types';

export interface AuditLogDto {
  id: string;
  actorId?: string | null;
  actor?: UserDto | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  detailsJson?: string | null;
  createdAt: string;
}
