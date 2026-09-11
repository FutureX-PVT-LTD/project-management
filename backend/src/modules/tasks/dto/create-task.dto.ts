import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsArray,
  IsInt,
  MaxLength,
  ArrayMaxSize,
  IsUrl,
} from "class-validator";
import { TaskStatus, TaskPriority, ReviewStatus } from "@futurex/shared";

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  milestoneId?: string;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsString()
  @IsOptional()
  workType?: string;

  @IsString()
  @IsOptional()
  checklistTemplateItemId?: string;

  @IsString()
  @IsOptional()
  checklistCode?: string;

  @IsString()
  @IsOptional()
  checklistPhase?: string;

  @IsString()
  @IsOptional()
  checklistStage?: string;

  @IsString()
  @IsOptional()
  checklistOwnerRole?: string;

  @IsString()
  @IsOptional()
  checklistDoneWhen?: string;

  @IsBoolean()
  @IsOptional()
  checklistMandatory?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  checklistOrder?: number;

  @IsBoolean()
  @IsOptional()
  allowParallelWork?: boolean;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsOptional()
  collaboratorIds?: string[];

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  @IsOptional()
  requiresReview?: boolean;

  @IsString()
  @IsOptional()
  parentTaskId?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsOptional()
  dependsOnTaskIds?: string[];
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  milestoneId?: string | null;

  @IsString()
  @IsOptional()
  assigneeId?: string | null;

  @IsBoolean()
  @IsOptional()
  allowParallelWork?: boolean;

  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsOptional()
  collaboratorIds?: string[];

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedHours?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  actualHours?: number | null;

  @IsDateString()
  @IsOptional()
  startDate?: string | null;

  @IsDateString()
  @IsOptional()
  dueDate?: string | null;

  @IsBoolean()
  @IsOptional()
  requiresReview?: boolean;

  @IsBoolean()
  @IsOptional()
  isManualBlocked?: boolean;

  @IsString()
  @IsOptional()
  manualBlockReason?: string | null;

  @IsString()
  @IsOptional()
  parentTaskId?: string | null;

  @IsUrl({ require_protocol: true })
  @IsOptional()
  checklistEvidenceUrl?: string | null;

  @IsString()
  @MaxLength(2000)
  @IsOptional()
  checklistNotes?: string | null;
}

export class ReviewTaskDto {
  @IsEnum(ReviewStatus)
  @IsNotEmpty()
  status: ReviewStatus;

  @IsString()
  @IsOptional()
  feedback?: string;

  @IsBoolean()
  @IsOptional()
  completeTask?: boolean;
}

export class CreateTaskDailyUpdateDto {
  @IsInt()
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  completedToday: string;

  @IsString()
  @IsOptional()
  blocker?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  nextStep: string;

  @IsString()
  @IsOptional()
  attachmentId?: string | null;
}
