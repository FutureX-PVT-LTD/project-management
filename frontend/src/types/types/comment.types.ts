import { UserDto } from './user.types';

export interface TaskCommentDto {
  id: string;
  taskId: string;
  authorId: string;
  author: UserDto;
  content: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentDto {
  taskId: string;
  content: string;
}

export interface UpdateCommentDto {
  content: string;
}
