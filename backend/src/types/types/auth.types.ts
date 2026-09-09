import { UserRole } from '../enums/roles.enum';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  avatarUrl?: string;
  globalRole: UserRole;
  isActive: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
}

export interface JwtPayload {
  sid?: string;
  sub: string;
  email: string;
  role: UserRole;
}
