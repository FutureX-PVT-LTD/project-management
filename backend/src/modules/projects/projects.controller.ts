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
} from './dto/create-project.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, ProjectMemberRole, AuthUser } from '@futurex/shared';

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

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @Post()
  async create(@Body() dto: CreateProjectDto, @CurrentUser('id') actorId: string) {
    return this.projectsService.create(dto, actorId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.projectsService.update(id, dto, actorId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body('userId') userId: string,
    @Body('role') role: ProjectMemberRole,
    @CurrentUser('id') actorId: string,
  ) {
    return this.projectsService.addMember(id, userId, role || ProjectMemberRole.MEMBER, actorId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @Delete(':id/members/:userId')
  async removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.projectsService.removeMember(id, userId, actorId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.PROJECT_MANAGER)
  @Post(':id/updates')
  async postUpdate(
    @Param('id') id: string,
    @Body() dto: PostProjectUpdateDto,
    @CurrentUser('id') authorId: string,
  ) {
    return this.projectsService.postUpdate(id, authorId, dto);
  }
}
