import { UserRole } from '../enums/roles.enum';

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  avatarUrl?: string;
  globalRole: UserRole;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  teams?: { id: string; name: string }[];
  assignedProjectsCount?: number;
  activeTasksCount?: number;
  estimatedWorkloadHours?: number;
}

export interface CreateUserDto {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  avatarUrl?: string;
  globalRole: UserRole;
  teamIds?: string[];
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  avatarUrl?: string;
  globalRole?: UserRole;
  isActive?: boolean;
  teamIds?: string[];
}
