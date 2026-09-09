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
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  PostProjectUpdateDto,
  GenerateDevelopmentChecklistDto,
  AssignChecklistItemDto,
  BulkResponsibilityAssignmentDto,
  AddProjectMemberDto,
} from './dto/create-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, ProjectMemberRole, AuthUser, ProductType } from '@futurex/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
  ) {
    return this.projectsService.findAll(user, status);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.findById(id, user);
  }

  @Get(':id/development-checklist')
  async getDevelopmentChecklist(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projectsService.getDevelopmentChecklist(id, user);
  }

  @Get('development-template/items')
  async getDevelopmentTemplate(@Query('productType') productType?: ProductType) {
    return this.projectsService.getDevelopmentTemplate(productType);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  async create(@Body() dto: CreateProjectDto, @CurrentUser() actor: AuthUser) {
    return this.projectsService.create(dto, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':id/generate-development-checklist')
  async generateDevelopmentChecklist(
    @Param('id') id: string,
    @Body() dto: GenerateDevelopmentChecklistDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.generateDevelopmentChecklist(id, actor.id, actor.globalRole, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/development-checklist/:taskId/assignment')
  async assignChecklistItem(
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() dto: AssignChecklistItemDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.assignChecklistItem(id, taskId, dto, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':id/development-checklist/bulk-assign')
  async bulkAssignChecklist(
    @Param('id') id: string,
    @Body() dto: BulkResponsibilityAssignmentDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.bulkAssignChecklist(id, dto, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.update(id, dto, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER)
  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.delete(id, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() dto: AddProjectMemberDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.addMember(id, dto.userId, dto.role || ProjectMemberRole.MEMBER, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.removeMember(id, userId, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':id/updates')
  async postUpdate(
    @Param('id') id: string,
    @Body() dto: PostProjectUpdateDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.projectsService.postUpdate(id, actor.id, dto, actor.globalRole);
  }
}
