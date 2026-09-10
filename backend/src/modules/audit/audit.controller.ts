import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@futurex/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuditQueryDto } from './audit-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER)
@Controller('audit-logs')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  async findAll(@Query() query: AuditQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get('dashboard-summary')
  async dashboardSummary() {
    return this.auditService.dashboardSummary();
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEAM_MEMBER)
  @Get('my-login-history')
  async ownLoginHistory(@CurrentUser('id') userId: string) {
    return this.auditService.ownLoginHistory(userId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEAM_MEMBER)
  @Get('my-sessions')
  async ownSessions(@CurrentUser('id') userId: string) {
    return this.auditService.ownSessions(userId);
  }
}
