import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class EditAdditionalWorkDto {
  @IsString() @MinLength(1) @MaxLength(200) @Matches(/\S/)
  title: string;

  @IsString() @MinLength(1) @MaxLength(5000) @Matches(/\S/)
  description: string;

  @IsDateString({ strict: true }) @Matches(/^\d{4}-\d{2}-\d{2}$/)
  workDate: string;

  @IsOptional() @IsInt() @Min(1) @Max(1440)
  minutesSpent?: number;
}

export class CreateAdditionalWorkDto extends EditAdditionalWorkDto {
  @IsUUID()
  projectId: string;
}
