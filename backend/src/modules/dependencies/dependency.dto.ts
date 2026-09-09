import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { DependencyType } from '@futurex/shared';
export class CreateDependencyDto {
  @IsString()
  @IsNotEmpty()
  predecessorTaskId: string;
  @IsString()
  @IsNotEmpty()
  dependentTaskId: string;
  @IsEnum(DependencyType)
  @IsOptional()
  type?: DependencyType;
}
