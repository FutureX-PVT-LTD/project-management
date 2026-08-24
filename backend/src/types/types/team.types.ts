import { UserDto } from './user.types';

export interface TeamDto {
  id: string;
  name: string;
  description?: string;
  leadUserId?: string;
  leadUser?: UserDto;
  membersCount?: number;
  members?: UserDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTeamDto {
  name: string;
  description?: string;
  leadUserId?: string;
  memberUserIds?: string[];
}
