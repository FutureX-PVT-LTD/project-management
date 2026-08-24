import { ProjectStatus, ProjectHealth, ProjectMemberRole } from '../enums/project.enum';
import { UserDto } from './user.types';

export interface ProjectMemberDto {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectMemberRole;
  joinedAt: string;
  user: UserDto;
}

export interface ProjectDto {
  id: string;
  key: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  health: ProjectHealth;
  healthReason?: string;
  manualHealthOverride?: boolean;
  progress: number;
  startDate?: string;
  targetDate?: string;
  completedDate?: string;
  projectManagerId?: string;
  projectManager?: UserDto;
  members?: ProjectMemberDto[];
  membersCount?: number;
  totalTasksCount?: number;
  completedTasksCount?: number;
  blockedTasksCount?: number;
  overdueTasksCount?: number;
  currentMilestoneName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  key: string;
  name: string;
  description?: string;
  status?: ProjectStatus;
  health?: ProjectHealth;
  startDate?: string;
  targetDate?: string;
  projectManagerId: string;
  memberIds?: { userId: string; role: ProjectMemberRole }[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  health?: ProjectHealth;
  healthReason?: string;
  manualHealthOverride?: boolean;
  startDate?: string;
  targetDate?: string;
  projectManagerId?: string;
}

export interface ProjectUpdateDto {
  id: string;
  projectId: string;
  authorId: string;
  author: UserDto;
  health: ProjectHealth;
  note: string;
  createdAt: string;
}
