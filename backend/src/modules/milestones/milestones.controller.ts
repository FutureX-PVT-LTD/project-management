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
import { UserRole } from '@futurex/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('milestones')
export class MilestonesController {
  constructor(private milestonesService: MilestonesService) {}

  @Get('project/:projectId')
  async findByProject(@Param('projectId') projectId: string) {
    return this.milestonesService.findByProject(projectId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateMilestoneDto) {
    return this.milestonesService.create(dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.milestonesService.update(id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.milestonesService.delete(id);
  }

}
