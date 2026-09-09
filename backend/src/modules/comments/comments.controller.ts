import {
  Controller,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { AuthUser } from '@futurex/shared';
import { CreateCommentDto, UpdateCommentDto } from './comments.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Post()
  async create(
    @Body() dto: CreateCommentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.commentsService.create(dto, actor.id, actor.globalRole);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.commentsService.update(id, dto, user.id, user.globalRole);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.commentsService.delete(id, user.id, user.globalRole);
  }
}
