import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsArray,
  IsBoolean,
  IsIn,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserRole } from '@futurex/shared';
import {
  PASSWORD_COMPLEXITY_REGEX,
  PASSWORD_COMPLEXITY_MESSAGE,
} from '../../auth/dto/login.dto';

export class CreateUserDto {
  @IsArray() @IsString({ each: true }) @IsOptional()
  functionalRoleIds?: string[];
  @IsEmail({}, { message: 'Must be a valid email' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsEnum(UserRole, { message: 'Invalid user role' })
  @IsNotEmpty()
  globalRole: UserRole;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128)
  @Matches(PASSWORD_COMPLEXITY_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  password: string;

  @IsArray()
  @IsOptional()
  teamIds?: string[];
}

export class UpdateUserDto {
  @IsArray() @IsString({ each: true }) @IsOptional()
  functionalRoleIds?: string[];
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  jobTitle?: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;

  @IsEnum(UserRole)
  @IsOptional()
  globalRole?: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  teamIds?: string[];
}

export class ResetUserPasswordDto {
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128)
  @Matches(PASSWORD_COMPLEXITY_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  newPassword: string;
}

export class ToggleUserActiveDto {
  @IsBoolean()
  isActive: boolean;
}

export class SaveJobRoleDto {
  @IsString() @Matches(/^[A-Z][A-Z0-9_]{1,49}$/) @IsOptional()
  code?: string;
  @IsString() @MinLength(1) @MaxLength(80) @IsOptional()
  name?: string;
  @IsIn(['MANAGEMENT', 'ENGINEERING', 'DESIGN', 'QUALITY', 'MARKETING', 'CONTENT']) @IsOptional()
  category?: string;
  @IsBoolean() @IsOptional()
  isActive?: boolean;
}
