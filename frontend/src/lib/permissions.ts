import { AuthUser, UserRole, TaskStatus } from '@futurex/shared';

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

export function isTaskAssignee(
  user?: AuthUser | null,
  task?: { assigneeId?: string | null } | null,
): boolean {
  if (!user || !task || !task.assigneeId) return false;
  return user.id === task.assigneeId;
}

export function canUpdateTaskProgress(
  user?: AuthUser | null,
  task?: { assigneeId?: string | null; status?: TaskStatus | string } | null,
): boolean {
  if (!user || !task) return false;
  return (
    user.globalRole === UserRole.TEAM_MEMBER &&
    task.assigneeId === user.id &&
    task.status === TaskStatus.IN_PROGRESS
  );
}

export function canStartTask(
  user?: AuthUser | null,
  task?: { assigneeId?: string | null; status?: TaskStatus | string } | null,
): boolean {
  if (!user || !task) return false;
  return (
    user.globalRole === UserRole.TEAM_MEMBER &&
    task.assigneeId === user.id &&
    task.status === TaskStatus.READY
  );
}

export function canSubmitForReview(
  user?: AuthUser | null,
  task?: { assigneeId?: string | null; status?: TaskStatus | string } | null,
): boolean {
  if (!user || !task) return false;
  return (
    user.globalRole === UserRole.TEAM_MEMBER &&
    task.assigneeId === user.id &&
    task.status === TaskStatus.IN_PROGRESS
  );
}

export function canReviewTask(
  user?: AuthUser | null,
  task?: { status?: TaskStatus | string } | null,
): boolean {
  if (!user || !task) return false;
  return (
    (user.globalRole === UserRole.ADMIN || user.globalRole === UserRole.OWNER) &&
    task.status === TaskStatus.IN_REVIEW
  );
}

export function canReportBlocker(
  user?: AuthUser | null,
  task?: { assigneeId?: string | null; status?: TaskStatus | string } | null,
): boolean {
  if (!user || !task) return false;
  return (
    user.globalRole === UserRole.TEAM_MEMBER &&
    task.assigneeId === user.id &&
    task.status === TaskStatus.IN_PROGRESS
  );
}

