import { TaskActionType } from '../enums/task.enum';
import { UserDto } from './user.types';

export interface TaskActivityDto {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  user: UserDto;
  actionType: TaskActionType;
  description: string;
  metadataJson?: string;
  createdAt: string;
}
