import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export const PASSWORD_COMPLEXITY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]).{12,}$/;

export const PASSWORD_COMPLEXITY_MESSAGE =
  'Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid work email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'New password must be at least 12 characters long' })
  @MaxLength(128)
  @Matches(PASSWORD_COMPLEXITY_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  newPassword: string;
}

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid work email address' })
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Password reset token is required' })
  token: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'New password must be at least 12 characters long' })
  @MaxLength(128)
  @Matches(PASSWORD_COMPLEXITY_REGEX, { message: PASSWORD_COMPLEXITY_MESSAGE })
  newPassword: string;
}
