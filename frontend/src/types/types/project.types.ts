import {
  ProjectStatus,
  ProjectHealth,
  ProjectMemberRole,
  ProductType,
} from "../enums/project.enum";
import { UserDto } from "./user.types";

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
  productType?: ProductType;
  status: ProjectStatus;
  health: ProjectHealth;
  healthReason?: string;
  manualHealthOverride?: boolean;
  progress: number;
  launchReadiness?: number;
  currentPhase?: string | null;
  checklistGeneratedAt?: string | null;
  checklistTemplateVersion?: string | null;
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
  checklistSummary?: ProjectChecklistSummaryDto;
  phaseProgress?: ProjectPhaseProgressDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  key?: string;
  name: string;
  description?: string;
  productType?: ProductType;
  status?: ProjectStatus;
  health?: ProjectHealth;
  startDate?: string;
  targetDate?: string;
  projectManagerId?: string;
  memberIds?: { userId: string; role: ProjectMemberRole }[];
}

export interface UpdateProjectDto {
  name?: string;
  description?: string;
  productType?: ProductType;
  status?: ProjectStatus;
  health?: ProjectHealth;
  healthReason?: string;
  manualHealthOverride?: boolean;
  startDate?: string;
  targetDate?: string;
  projectManagerId?: string;
}

export interface ProjectChecklistSummaryDto {
  totalApplicable: number;
  completed: number;
  inProgress: number;
  ready: number;
  waiting: number;
  blocked: number;
  unassigned: number;
  inReview: number;
  notApplicable: number;
  progress: number;
  launchReadiness: number;
  currentPhase: string | null;
}

export interface ProjectPhaseProgressDto {
  phase: string;
  totalApplicable: number;
  completed: number;
  inProgress: number;
  ready: number;
  waiting: number;
  blocked: number;
  unassigned: number;
  progress: number;
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
