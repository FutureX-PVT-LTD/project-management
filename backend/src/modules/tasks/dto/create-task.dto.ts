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
  @IsNumber()
  @Min(0)
  @Max(100)
  progress: number;

  @IsString()
  @IsNotEmpty()
  completedToday: string;

  @IsString()
  @IsOptional()
  blocker?: string | null;

  @IsString()
  @IsNotEmpty()
  nextStep: string;

  @IsString()
  @IsOptional()
  attachmentId?: string | null;
}
