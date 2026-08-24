import { MilestoneStatus } from '../enums/project.enum';

export interface MilestoneDto {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  targetDate: string;
  status: MilestoneStatus;
  progress: number;
  orderIndex: number;
  tasksCount?: number;
  completedTasksCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMilestoneDto {
  projectId: string;
  name: string;
  description?: string;
  targetDate: string;
  status?: MilestoneStatus;
  orderIndex?: number;
}

export interface UpdateMilestoneDto {
  name?: string;
  description?: string;
  targetDate?: string;
  status?: MilestoneStatus;
  orderIndex?: number;
}
