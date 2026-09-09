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
import { TeamsService } from './teams.service';
import { UserRole, AuthUser } from '@futurex/shared';
import { CreateTeamDto, UpdateTeamDto } from './team.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  async findAll(@CurrentUser() actor: AuthUser) {
    return this.teamsService.findAll(actor.globalRole === UserRole.TEAM_MEMBER ? actor.id : undefined);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.teamsService.findById(id, actor.globalRole === UserRole.TEAM_MEMBER ? actor.id : undefined);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Post()
  async create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.teamsService.delete(id);
  }
}
