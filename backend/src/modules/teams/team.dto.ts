import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
export class CreateTeamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;
  @IsString()
  @IsOptional()
  leadUserId?: string;
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @IsOptional()
  memberUserIds?: string[];
}
export class UpdateTeamDto extends PartialType(CreateTeamDto) {}
