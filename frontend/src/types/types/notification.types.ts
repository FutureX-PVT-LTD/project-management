import { NotificationType } from '../enums/notification.enum';

export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}
