import { Controller, Get, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@futurex/shared';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('owner-dashboard')
  async getOwnerDashboard() {
    return this.reportsService.getOwnerDashboardData();
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('pm-dashboard')
  async getPMDashboard(@CurrentUser('id') pmUserId: string) {

    return this.reportsService.getPMDashboardData(pmUserId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('analytics')
  async getReports() {
    return this.reportsService.getReportsData();
  }
}
