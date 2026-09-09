import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;
}
export class CreateCommentDto extends UpdateCommentDto {
  @IsString()
  @IsNotEmpty()
  taskId: string;
}
