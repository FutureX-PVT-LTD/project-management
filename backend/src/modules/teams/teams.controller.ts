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
import { CreateTeamDto, UserRole } from '@futurex/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Get()
  async findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.teamsService.findById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Post()
  async create(@Body() dto: CreateTeamDto) {
    return this.teamsService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateTeamDto>) {
    return this.teamsService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.teamsService.delete(id);
  }
}
