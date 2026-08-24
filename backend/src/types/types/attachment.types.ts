import { UserDto } from './user.types';

export interface TaskAttachmentDto {
  id: string;
  taskId: string;
  projectId: string;
  uploaderId: string;
  uploader: UserDto;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

export interface UploadFileResponse {
  attachment: TaskAttachmentDto;
}
