import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  IsBoolean,
  Matches,
} from 'class-validator';
import { ProjectStatus, ProjectHealth, ProjectMemberRole } from '@futurex/shared';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z0-9]{2,6}$/i, {
    message: 'Project key must be 2-6 letters or numbers.',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsEnum(ProjectHealth)
  @IsOptional()
  health?: ProjectHealth;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsString()
  @IsOptional()
  projectManagerId?: string;

  @IsArray()
  @IsOptional()
  memberIds?: { userId: string; role: ProjectMemberRole }[];
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsEnum(ProjectHealth)
  @IsOptional()
  health?: ProjectHealth;

  @IsString()
  @IsOptional()
  healthReason?: string;

  @IsBoolean()
  @IsOptional()
  manualHealthOverride?: boolean;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsString()
  @IsOptional()
  projectManagerId?: string;
}

export class PostProjectUpdateDto {
  @IsEnum(ProjectHealth)
  @IsNotEmpty()
  health: ProjectHealth;

  @IsString()
  @IsNotEmpty()
  note: string;
}
