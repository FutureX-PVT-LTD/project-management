import { IsArray, IsBoolean, IsDateString, IsEmail, IsIn, IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class InitializeMarketingDto {}

export class MarketingAssignmentDto {
  @IsString() @IsOptional() headId?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() teamIds?: string[];
  @IsObject() @IsOptional() mappings?: Record<string, string | null>;
  @IsObject() @IsOptional() phaseMappings?: Record<string, string | null>;
}

export class AssignMarketingItemDto {
  @IsString() @IsOptional() assigneeId?: string | null;
  @IsDateString() @IsOptional() dueDate?: string | null;
}

export class UpdateChannelDto {
  @IsString() @IsOptional() @MaxLength(120) handle?: string;
  @IsUrl({ require_protocol: true }) @IsOptional() publicUrl?: string;
  @IsEmail() @IsOptional() adminEmail?: string;
  @IsBoolean() @IsOptional() twoFactorEnabled?: boolean;
  @IsString() @IsOptional() backupAdminId?: string | null;
  @IsIn(['NOT_CREATED', 'IN_PROGRESS', 'READY', 'BLOCKED', 'N_A']) @IsOptional() status?: string;
  @IsString() @IsOptional() @MaxLength(2000) notes?: string;
}

export class UpdateContentDto {
  @IsString() @IsOptional() ownerId?: string | null;
  @IsIn(['NOT_STARTED', 'IN_PRODUCTION', 'READY', 'BLOCKED']) @IsOptional() assetStatus?: string;
  @IsIn(['NOT_POSTED', 'SCHEDULED', 'POSTED', 'SKIPPED', 'N_A']) @IsOptional() postStatus?: string;
  @IsUrl({ require_protocol: true }) @IsOptional() assetLink?: string;
  @IsString() @IsOptional() @MaxLength(2000) notes?: string;
  @IsDateString() @IsOptional() targetDate?: string | null;
  @IsDateString() @IsOptional() scheduledDate?: string | null;
  @IsArray() @IsString({ each: true }) @IsOptional() platforms?: string[];
}

export class UpdateBuzzDto {
  @IsString() @IsOptional() ownerId?: string | null;
  @IsIn(['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'BLOCKED']) @IsOptional() status?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() platforms?: string[];
}

export class ApproveGateDto {
  @IsIn(['APPROVED']) status: string;
}

export class RescheduleMarketingDto {
  @IsDateString() targetDate: string;
}

export class UpdateSignoffDto {
  @IsIn(['PENDING', 'VERIFIED', 'FIX_REQUIRED', 'N_A']) @IsOptional() marketingCheck?: string;
  @IsIn(['PENDING', 'VERIFIED', 'FIX_REQUIRED', 'N_A']) @IsOptional() pmCheck?: string;
  @IsString() @IsOptional() @MaxLength(2000) issueGap?: string;
  @IsString() @IsOptional() ownerId?: string | null;
  @IsDateString() @IsOptional() targetFixDate?: string | null;
}
