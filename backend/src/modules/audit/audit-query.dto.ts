import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class AuditQueryDto {
  @IsOptional() @IsString() @MaxLength(100) action?: string;
  @IsOptional() @IsUUID() actorId?: string;
  @IsOptional() @IsString() @MaxLength(100) entityType?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsIn(['success', 'failed']) outcome?: 'success' | 'failed';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100000) offset?: number;
}
