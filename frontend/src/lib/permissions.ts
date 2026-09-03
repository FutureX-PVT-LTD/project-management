import { AuthUser, UserRole } from '@futurex/shared';

export function canManageProjects(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.globalRole === UserRole.ADMIN || user.globalRole === UserRole.OWNER;
}

export function canEditProject(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.globalRole === UserRole.ADMIN || user.globalRole === UserRole.OWNER;
}

export function canManageMembers(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.globalRole === UserRole.ADMIN || user.globalRole === UserRole.OWNER;
}

export function canCreateTask(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.globalRole === UserRole.ADMIN || user.globalRole === UserRole.OWNER;
}

export function canManageUsers(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.globalRole === UserRole.ADMIN || user.globalRole === UserRole.OWNER;
}

export function canReviewWork(user?: AuthUser | null): boolean {
  if (!user) return false;
  return user.globalRole === UserRole.ADMIN || user.globalRole === UserRole.OWNER;
}

export function isTeamMember(user?: AuthUser | null): boolean {
  return user?.globalRole === UserRole.TEAM_MEMBER;
}

export function isAdmin(user?: AuthUser | null): boolean {
  return user?.globalRole === UserRole.ADMIN;
}

export function isOwner(user?: AuthUser | null): boolean {
  return user?.globalRole === UserRole.OWNER;
}
