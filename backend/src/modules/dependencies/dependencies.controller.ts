import { Controller, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { DependenciesService } from './dependencies.service';
import { UserRole, AuthUser } from '@futurex/shared';
import { CreateDependencyDto } from './dependency.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dependencies')
export class DependenciesController {
  constructor(private dependenciesService: DependenciesService) {}

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  async addDependency(
    @Body() dto: CreateDependencyDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dependenciesService.addDependency(dto, actor.id, actor.globalRole);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  async removeDependency(
    @Param('id') id: string,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.dependenciesService.removeDependency(id, actor.id, actor.globalRole);
  }

}
