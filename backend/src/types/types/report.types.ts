import { ProjectHealth, ProjectStatus } from '../enums/project.enum';
import { TaskStatus, TaskPriority } from '../enums/task.enum';

export interface PortfolioReportDto {
  totalProjects: number;
  activeProjects: number;
  onTrackProjects: number;
  atRiskProjects: number;
  offTrackProjects: number;
  completedProjects: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  tasksDueThisWeek: number;
}

export interface ProjectHealthSummaryDto {
  id: string;
  key: string;
  name: string;
  status: ProjectStatus;
  health: ProjectHealth;
  healthReason?: string;
  progress: number;
  projectManagerName: string;
  targetDate?: string;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  overdueTasks: number;
}

export interface UserWorkloadDto {
  userId: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string;
  jobTitle?: string;
  activeTasksCount: number;
  blockedTasksCount: number;
  dueSoonTasksCount: number;
  estimatedHours: number;
  capacityLevel: 'AVAILABLE' | 'BALANCED' | 'HIGH';
}

export interface StatusDistributionDto {
  status: TaskStatus;
  count: number;
  percentage: number;
}

export interface PriorityDistributionDto {
  priority: TaskPriority;
  count: number;
}

export interface MilestoneDeliveryReportDto {
  milestoneId: string;
  milestoneName: string;
  projectName: string;
  projectKey: string;
  targetDate: string;
  progress: number;
  isDelayed: boolean;
  totalTasks: number;
  completedTasks: number;
}
