import { DependencyType } from '../enums/task.enum';

export interface CreateDependencyDto {
  predecessorTaskId: string;
  dependentTaskId: string;
  type?: DependencyType;
}

export interface DependencyValidationResult {
  isValid: boolean;
  hasCycle?: boolean;
  message?: string;
}
