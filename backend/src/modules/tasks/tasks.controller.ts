import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import {
  CreateTaskDailyUpdateDto,
  CreateTaskDto,
  ReviewTaskDto,
  UpdateTaskDto,
} from './dto/create-task.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser, TaskStatus, TaskPriority, UserRole } from '@futurex/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get('my-work')
  async findMyWork(
    @CurrentUser('id') userId: string,
    @Query('tab') tab?: string,
    @Query('status') status?: TaskStatus,
    @Query('projectId') projectId?: string,
    @Query('priority') priority?: TaskPriority,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findMyWork(userId, {
      tab,
      status,
      projectId,
      priority,
      search,
    });
  }

  @Get('dashboard')
  async getUserDashboard(
    @CurrentUser() actor: AuthUser,
    @Query('projectId') projectId?: string,
    @Query('workstream') workstream?: string,
  ) {
    return this.tasksService.getUserDashboard(actor.id, actor.globalRole, {
      projectId,
      workstream,
    });
  }

  @Get()
  async findAll(
    @CurrentUser() actor: AuthUser,
    @Query('projectId') projectId?: string,
    @Query('milestoneId') milestoneId?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('search') search?: string,
    @Query('parentTaskId') parentTaskId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.tasksService.findAll(
      {
        projectId,
        milestoneId,
        assigneeId,
        status,
        priority,
        search,
        parentTaskId: parentTaskId === 'null' ? null : parentTaskId,
        startDate,
        endDate,
      },
      actor.id,
      actor.globalRole,
    );
  }

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.tasksService.findById(id, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tasksService.create(dto, actor.id, actor.globalRole);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tasksService.update(id, dto, actor.id, actor.globalRole);
  }

  @Post(':id/daily-updates')
  @HttpCode(201)
  async submitDailyUpdate(
    @Param('id') id: string,
    @Body() dto: CreateTaskDailyUpdateDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tasksService.submitDailyUpdate(id, actor.id, actor.globalRole, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':id/review')
  async review(
    @Param('id') id: string,
    @Body() dto: ReviewTaskDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tasksService.review(id, actor.id, actor.globalRole, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.tasksService.delete(id, actor.id, actor.globalRole);
  }

}
