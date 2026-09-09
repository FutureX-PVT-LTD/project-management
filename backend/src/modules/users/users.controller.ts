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
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, ResetUserPasswordDto, ToggleUserActiveDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, AuthUser } from '@futurex/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  async findAll(
    @CurrentUser() actor: AuthUser,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('teamId') teamId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    if (actor.globalRole === UserRole.TEAM_MEMBER) return this.usersService.findDirectory(actor.id);
    return this.usersService.findAll({ search, role, teamId, isActive: activeBool });
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.create(dto, actor.id, actor.globalRole);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.update(id, dto, actor.id, actor.globalRole);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch(':id/toggle-active')
  async toggleActive(
    @Param('id') id: string,
    @Body() dto: ToggleUserActiveDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.toggleActive(id, dto.isActive, actor.id, actor.globalRole);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Post(':id/reset-password')
  async resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetUserPasswordDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.usersService.resetPassword(id, dto.newPassword, actor.id, actor.globalRole);
  }
}
