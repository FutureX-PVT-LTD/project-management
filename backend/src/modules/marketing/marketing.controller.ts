import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@futurex/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ApproveGateDto, AssignMarketingItemDto, InitializeMarketingDto, MarketingAssignmentDto, RescheduleMarketingDto, UpdateBuzzDto, UpdateChannelDto, UpdateContentDto, UpdateSignoffDto } from './marketing.dto';
import { MarketingService } from './marketing.service';

@Controller('projects/:projectId/marketing')
export class MarketingController {
  constructor(private readonly service: MarketingService) {}

  @Get('summary') summary(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) { return this.service.summary(projectId, actor); }
  @Get('checklist') checklist(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) { return this.service.checklist(projectId, actor); }
  @Get('channels') channels(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) { return this.service.channels(projectId, actor); }
  @Get('content') content(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) { return this.service.content(projectId, actor); }
  @Get('buzz') buzz(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) { return this.service.buzz(projectId, actor); }
  @Get('gates') gates(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) { return this.service.gates(projectId, actor); }
  @Get('signoff') signoff(@Param('projectId') projectId: string, @CurrentUser() actor: AuthUser) { return this.service.signoff(projectId, actor); }
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Get('reschedule-preview') reschedulePreview(@Param('projectId') projectId: string, @Query('targetDate') targetDate: string, @CurrentUser() actor: AuthUser) { return this.service.reschedulePreview(projectId, targetDate, actor); }

  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Post('initialize') initialize(@Param('projectId') projectId: string, @Body() _dto: InitializeMarketingDto, @CurrentUser() actor: AuthUser) { return this.service.initialize(projectId, actor); }
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Post('assignments') assign(@Param('projectId') projectId: string, @Body() dto: MarketingAssignmentDto, @CurrentUser() actor: AuthUser) { return this.service.bulkAssign(projectId, dto, actor); }
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch('checklist/:id/assignment') assignItem(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: AssignMarketingItemDto, @CurrentUser() actor: AuthUser) { return this.service.assignItem(projectId, id, dto, actor); }
  @Patch('channels/:id') updateChannel(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateChannelDto, @CurrentUser() actor: AuthUser) { return this.service.updateChannel(projectId, id, dto, actor); }
  @Patch('content/:id') updateContent(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateContentDto, @CurrentUser() actor: AuthUser) { return this.service.updateContent(projectId, id, dto, actor); }
  @Patch('buzz/:id') updateBuzz(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateBuzzDto, @CurrentUser() actor: AuthUser) { return this.service.updateBuzz(projectId, id, dto, actor); }
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch('gates/:id') approveGate(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: ApproveGateDto, @CurrentUser() actor: AuthUser) { return this.service.approveGate(projectId, id, dto, actor); }
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch('signoff/:id') updateSignoff(@Param('projectId') projectId: string, @Param('id') id: string, @Body() dto: UpdateSignoffDto, @CurrentUser() actor: AuthUser) { return this.service.updateSignoff(projectId, id, dto, actor); }
  @Roles(UserRole.ADMIN, UserRole.OWNER)
  @Patch('reschedule') reschedule(@Param('projectId') projectId: string, @Body() dto: RescheduleMarketingDto, @CurrentUser() actor: AuthUser) { return this.service.reschedule(projectId, dto.targetDate, actor); }
}
