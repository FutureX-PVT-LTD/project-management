import { IsEnum, IsNotEmpty, IsOptional, IsString, IsDateString, IsInt } from 'class-validator';
import { MilestoneStatus } from '@futurex/shared';

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  targetDate: string;

  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;

  @IsInt()
  @IsOptional()
  orderIndex?: number;
}

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  targetDate?: string;

  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;

  @IsInt()
  @IsOptional()
  orderIndex?: number;
}
