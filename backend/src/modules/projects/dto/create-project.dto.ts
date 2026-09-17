import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsArray,
  IsBoolean,
  IsObject,
  IsIn,
  Matches,
  ValidateNested,
} from "class-validator";
import { Type } from 'class-transformer';
import {
  ProjectStatus,
  ProjectHealth,
  ProjectMemberRole,
  ProductType,
} from "@futurex/shared";

export class ProjectMemberSelectionDto {
  @IsString() userId: string;
  @IsArray() @IsString({ each: true }) functionalRoleIds: string[];
}

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

  @IsString()
  @IsOptional()
  targetMarket?: string;

  @IsString()
  @IsOptional()
  targetLanguage?: string;

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
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberSelectionDto)
  @IsOptional()
  memberIds?: ProjectMemberSelectionDto[];

  @IsBoolean()
  @IsOptional()
  developmentEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  marketingEnabled?: boolean;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  targetMarket?: string;

  @IsString()
  @IsOptional()
  targetLanguage?: string;

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

  @IsBoolean()
  @IsOptional()
  confirmReassignment?: boolean;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkResponsibilityAssignmentDto {
  @IsObject()
  @IsOptional()
  mappings?: Record<string, string | null>;

  @IsObject()
  @IsOptional()
  phaseMappings?: Record<string, string | null>;

  @IsIn(['DEVELOPMENT', 'MARKETING'])
  @IsOptional()
  workstream?: string;
}

export class PhaseAssignmentInputDto {
  @IsString()
  @IsNotEmpty()
  phaseKey: string;

  @IsString()
  @IsOptional()
  defaultAssigneeId?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  additionalMemberIds?: string[];

  @IsBoolean()
  @IsOptional()
  reassignActive?: boolean;
}

export class ApplyPhaseAssignmentsDto {
  @IsIn(['DEVELOPMENT', 'MARKETING'])
  workstream: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseAssignmentInputDto)
  assignments: PhaseAssignmentInputDto[];
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
  @IsArray() @IsString({ each: true }) @IsOptional()
  functionalRoleIds?: string[];
}

export class UpdateProjectMemberRolesDto {
  @IsArray() @IsString({ each: true })
  functionalRoleIds: string[];
}

export class SaveProjectDraftDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  targetMarket?: string;

  @IsString()
  @IsOptional()
  targetLanguage?: string;

  @IsEnum(ProductType)
  @IsOptional()
  productType?: ProductType;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsString()
  @IsOptional()
  projectManagerId?: string;

  @IsString()
  @IsIn(["DETAILS", "TEAM", "WORKSTREAMS", "REVIEW"])
  @IsOptional()
  currentStep?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  selectedMemberIds?: string[];

  @IsObject()
  @IsOptional()
  projectRoles?: Record<string, string[]>;

  @IsBoolean()
  @IsOptional()
  developmentEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  marketingEnabled?: boolean;
}
