import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  IsBoolean,
  IsObject,
  Matches,
} from "class-validator";
import {
  ProjectStatus,
  ProjectHealth,
  ProjectMemberRole,
  ProductType,
} from "@futurex/shared";

export class CreateProjectDto {
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z0-9]{2,6}$/i, {
    message: "Project key must be 2-6 letters or numbers.",
  })
  key?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

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

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

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

export class GenerateDevelopmentChecklistDto {
  @IsString()
  @IsOptional()
  templateVersion?: string;
}

export class AssignChecklistItemDto {
  @IsString()
  @IsOptional()
  assigneeId?: string | null;

  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @IsBoolean()
  @IsOptional()
  requiresReview?: boolean;

  @IsBoolean()
  @IsOptional()
  allowParallelWork?: boolean;
}

export class BulkResponsibilityAssignmentDto {
  @IsObject()
  @IsOptional()
  mappings?: Record<string, string | null>;

  @IsObject()
  @IsOptional()
  phaseMappings?: Record<string, string | null>;
}

export class PostProjectUpdateDto {
  @IsEnum(ProjectHealth)
  @IsNotEmpty()
  health: ProjectHealth;

  @IsString()
  @IsNotEmpty()
  note: string;
}

export class AddProjectMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
  @IsEnum(ProjectMemberRole)
  @IsOptional()
  role?: ProjectMemberRole;
}
