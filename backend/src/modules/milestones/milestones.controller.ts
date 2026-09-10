import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/create-milestone.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AuthUser } from '@futurex/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('milestones')
export class MilestonesController {
  constructor(private milestonesService: MilestonesService) {}

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) {
    return this.milestonesService.findByProject(projectId, actor);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateMilestoneDto, @CurrentUser() actor: AuthUser) {
    return this.milestonesService.create(dto, actor);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.milestonesService.update(id, dto, actor);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.milestonesService.delete(id, actor);
  }
}
