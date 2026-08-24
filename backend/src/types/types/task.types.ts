import { TaskStatus, TaskPriority, ReviewStatus } from '../enums/task.enum';
import { UserDto } from './user.types';

export interface TaskDto {
  id: string;
  taskNumber: number;
  humanId: string;
  title: string;
  description?: string;
  projectId: string;
  project?: { id: string; key: string; name: string };
  milestoneId?: string | null;
  milestone?: { id: string; name: string } | null;
  creatorId: string;
  creator?: UserDto;
  assigneeId?: string | null;
  assignee?: UserDto | null;
  collaborators?: UserDto[];
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  requiresReview: boolean;
  reviewStatus?: ReviewStatus | null;
  reviewFeedback?: string | null;
  isManualBlocked: boolean;
  manualBlockReason?: string | null;
  parentTaskId?: string | null;
  parentTask?: { id: string; humanId: string; title: string } | null;
  subtasks?: TaskDto[];
  subtasksCount?: number;
  completedSubtasksCount?: number;
  blockedBy?: TaskDependencyDto[];
  blocking?: TaskDependencyDto[];
  commentsCount?: number;
  attachmentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDependencyDto {
  id: string;
  predecessorTaskId: string;
  dependentTaskId: string;
  predecessorTask?: {
    id: string;
    humanId: string;
    title: string;
    status: TaskStatus;
    assignee?: UserDto | null;
  };
  dependentTask?: {
    id: string;
    humanId: string;
    title: string;
    status: TaskStatus;
    assignee?: UserDto | null;
  };
  createdAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  milestoneId?: string;
  assigneeId?: string;
  collaboratorIds?: string[];
  priority?: TaskPriority;
  status?: TaskStatus;
  progress?: number;
  estimatedHours?: number;
  startDate?: string;
  dueDate?: string;
  requiresReview?: boolean;
  parentTaskId?: string;
  dependsOnTaskIds?: string[];
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  milestoneId?: string | null;
  assigneeId?: string | null;
  collaboratorIds?: string[];
  priority?: TaskPriority;
  status?: TaskStatus;
  progress?: number;
  estimatedHours?: number | null;
  actualHours?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  requiresReview?: boolean;
  isManualBlocked?: boolean;
  manualBlockReason?: string | null;
  parentTaskId?: string | null;
}

export interface ReviewTaskDto {
  status: ReviewStatus;
  feedback?: string;
}
