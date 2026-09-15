import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, NotificationType, TaskPriority, TaskStatus, UserRole } from '@futurex/shared';
import { PrismaService } from '../prisma/prisma.service';
import { projectScope, publicUserSelect, requireManager, requireProject } from '../../common/security/access-policy';
import { marketingChecklistItems, MARKETING_TEMPLATE_VERSION } from './marketing-template';
import { ApproveGateDto, AssignMarketingItemDto, MarketingAssignmentDto, UpdateBuzzDto, UpdateChannelDto, UpdateContentDto, UpdateSignoffDto } from './marketing.dto';

const channels = ['Google Account', 'Domain', 'Product Website', 'Google Search Console', 'Analytics', 'YouTube', 'Facebook', 'TikTok', 'Instagram', 'Threads', 'X / Twitter', 'Discord', 'WhatsApp Channel', 'Reddit', 'Google Play', 'App Store'];
const contentTypes = ['Teaser', 'Teaser', 'Behind the Scenes', 'Reveal', 'Gameplay / Demo', 'Feature', 'Countdown', 'Launch', 'Social Proof', 'Highlight'];
const buzzWindows = [
  ['B01', 'Preparation', -21, -14, 'Finish infrastructure, profiles, Content Bank and schedule.'],
  ['B02', 'Curiosity', -14, -8, 'Teasers, clues, features and behind-the-scenes.'],
  ['B03', 'Reveal', -7, -4, 'Reveal the Product name, value and key features.'],
  ['B04', 'Anticipation', -3, -1, 'Countdown and launch-date messaging.'],
  ['B05', 'Conversion', 0, 0, 'Official launch, call to action and pinned content.'],
  ['B06', 'Momentum', 1, 3, 'Highlights, reactions, fixes and creator clips.'],
  ['B07', 'Proof & Scale', 4, 7, 'Milestones, reviews and best-performing creative.'],
] as const;
const gates = [
  ['MG-01', 'Infrastructure Ready', 'Required Marketing infrastructure checklist items are complete.'],
  ['MG-02', 'Channels Ready', 'Required and applicable channels are ready.'],
  ['MG-03', 'Content Bank Ready', 'Required launch content is ready.'],
  ['MG-04', 'Initial Buzz Ready', 'Required pre-launch buzz activity is complete.'],
] as const;
const signoffs = ['Ownership', 'Domain & Website', 'Social Footprint', 'Digital Links', 'Content Bank', 'Buzz Schedule', 'Tracking', 'Launch Approval'];

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  private async project(projectId: string, actor: AuthUser) { return requireProject(this.prisma, projectId, actor); }
  private isManager(actor: AuthUser) { return actor.globalRole === UserRole.ADMIN || actor.globalRole === UserRole.OWNER; }
  private async eligible(projectId: string, userId: string | null | undefined) {
    if (!userId) return;
    const user = await this.prisma.user.findFirst({ where: { id: userId, isActive: true, deletedAt: null, projectMemberships: { some: { projectId } } }, select: { id: true } });
    if (!user) throw new BadRequestException('Assignee must be an active Product member');
  }
  private async audit(tx: any, actorId: string, action: string, type: string, id: string, details?: unknown) {
    await tx.auditLog.create({ data: { actorId, action, entityType: type, entityId: id, detailsJson: details ? JSON.stringify(details) : undefined } });
  }

  private async gateEligibility(projectId: string) {
    const [tasks, channels, content, buzz] = await Promise.all([
      this.prisma.task.findMany({ where: { projectId, workstream: 'MARKETING', deletedAt: null }, select: { status: true, checklistMandatory: true, checklistTemplateItem: { select: { sourceConfirmed: true } } } }),
      this.prisma.marketingChannel.findMany({ where: { projectId }, select: { requirement: true, status: true } }),
      this.prisma.marketingContentItem.findMany({ where: { projectId }, select: { assetStatus: true } }),
      this.prisma.marketingBuzzActivity.findMany({ where: { projectId, endOffsetDays: { lte: 0 } }, select: { status: true } }),
    ]);
    const mandatoryTasks = tasks.filter((task) => task.checklistMandatory && task.status !== TaskStatus.N_A);
    return {
      'MG-01': mandatoryTasks.length > 0 && mandatoryTasks.every((task) => task.status === TaskStatus.DONE && task.checklistTemplateItem?.sourceConfirmed),
      'MG-02': channels.filter((row) => row.requirement === 'REQUIRED').every((row) => row.status === 'READY'),
      'MG-03': content.length > 0 && content.every((row) => row.assetStatus === 'READY'),
      'MG-04': buzz.length > 0 && buzz.every((row) => row.status === 'DONE'),
    } as Record<string, boolean>;
  }

  async initialize(projectId: string, actor: AuthUser) {
    requireManager(actor.globalRole);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true, key: true, targetDate: true } });
    if (!project) throw new NotFoundException('Product not found');
    if (!project.targetDate) throw new BadRequestException('Target launch date is required to initialize Marketing');
    const existing = await this.prisma.projectWorkstream.findUnique({ where: { projectId_workstream: { projectId, workstream: 'MARKETING' } } });
    if (existing?.generatedAt) return { success: true, alreadyInitialized: true, summary: await this.summary(projectId, actor) };

    const result = await this.prisma.$transaction(async (tx: any) => {
      for (const item of marketingChecklistItems) {
        await tx.checklistTemplateItem.upsert({
          where: { code: item.code },
          update: { ...item, workstream: 'MARKETING', templateVersion: MARKETING_TEMPLATE_VERSION, sourceConfirmed: item.sourceConfirmed, isActive: true },
          create: { ...item, workstream: 'MARKETING', templateVersion: MARKETING_TEMPLATE_VERSION, sourceConfirmed: item.sourceConfirmed, isActive: true },
        });
      }
      const template = await tx.checklistTemplateItem.findMany({ where: { workstream: 'MARKETING', templateVersion: MARKETING_TEMPLATE_VERSION, isActive: true }, orderBy: { defaultOrder: 'asc' } });
      const lastTask = await tx.task.findFirst({ where: { projectId }, orderBy: { taskNumber: 'desc' }, select: { taskNumber: true } });
      let number = lastTask?.taskNumber || 100;
      for (const item of template) {
        number += 1;
        await tx.task.create({ data: {
          projectId, creatorId: actor.id, taskNumber: number, humanId: `${project.key}-${number}`,
          title: item.title, description: item.description, workstream: 'MARKETING', workType: 'STANDARD_CHECKLIST',
          checklistTemplateItemId: item.id, checklistCode: item.code, checklistPhase: item.phase, checklistStage: item.stage,
          checklistOwnerRole: item.ownerRole, checklistDoneWhen: item.doneWhen, checklistMandatory: item.mandatory,
          checklistOrder: item.defaultOrder, allowParallelWork: item.allowParallelWork, requiresReview: item.requiresReview,
          priority: item.mandatory ? TaskPriority.HIGH : TaskPriority.MEDIUM, status: TaskStatus.UNASSIGNED, progress: 0,
        } });
      }
      for (const [index, platform] of channels.entries()) {
        const code = `CH-${String(index + 1).padStart(2, '0')}`;
        const requirement = ['Google Play', 'App Store'].includes(platform) ? 'WHEN_APPLICABLE' : index < 9 ? 'REQUIRED' : 'OPTIONAL';
        await tx.marketingChannel.create({ data: { projectId, code, platform, requirement } });
      }
      for (const [index, contentType] of contentTypes.entries()) {
        const code = `C${String(index + 1).padStart(2, '0')}`;
        await tx.marketingContentItem.create({ data: { projectId, code, stage: index < 3 ? 'CURIOSITY' : index < 6 ? 'REVEAL' : index < 8 ? 'ANTICIPATION' : 'MOMENTUM', contentType, concept: 'Needs source confirmation from the approved Marketing workbook.' } });
      }
      const launch = project.targetDate;
      for (const [code, stage, startOffset, endOffset, objective] of buzzWindows) {
        const startDate = new Date(launch); startDate.setUTCDate(startDate.getUTCDate() + startOffset);
        const endDate = new Date(launch); endDate.setUTCDate(endDate.getUTCDate() + endOffset);
        await tx.marketingBuzzActivity.create({ data: { projectId, code, stage, objective, startOffsetDays: startOffset, endOffsetDays: endOffset, startDate, endDate, platforms: ['Facebook', 'TikTok', 'YouTube'] } });
      }
      for (const [code, name, requirement] of gates) await tx.marketingGate.create({ data: { projectId, code, name, requirement } });
      for (const [index, checkName] of signoffs.entries()) await tx.marketingSignoffItem.create({ data: { projectId, code: `MS-${String(index + 1).padStart(2, '0')}`, checkName, requirement: 'Needs exact requirement confirmation from the approved Marketing workbook.' } });
      await tx.projectWorkstream.upsert({ where: { projectId_workstream: { projectId, workstream: 'MARKETING' } }, update: { templateVersion: MARKETING_TEMPLATE_VERSION, status: 'SETUP', generatedAt: new Date() }, create: { projectId, workstream: 'MARKETING', templateVersion: MARKETING_TEMPLATE_VERSION, status: 'SETUP', generatedAt: new Date() } });
      await this.audit(tx, actor.id, 'MARKETING_WORKSPACE_INITIALIZED', 'Project', projectId, { checklistItems: template.length, sourceConfirmationRequired: template.filter((item: any) => !item.sourceConfirmed).length });
      return { checklistItems: template.length, channels: channels.length, contentItems: contentTypes.length, buzzActivities: buzzWindows.length, gates: gates.length, signoffItems: signoffs.length };
    });
    return { success: true, alreadyInitialized: false, ...result, summary: await this.summary(projectId, actor) };
  }

  async summary(projectId: string, actor: AuthUser) {
    await this.project(projectId, actor);
    const [workspace, tasks, channelRows, contentRows, buzz, gateRows, signoffRows] = await Promise.all([
      this.prisma.projectWorkstream.findUnique({ where: { projectId_workstream: { projectId, workstream: 'MARKETING' } } }),
      this.prisma.task.findMany({ where: { projectId, workstream: 'MARKETING', deletedAt: null }, select: { status: true, progress: true, assigneeId: true, checklistTemplateItem: { select: { sourceConfirmed: true } } } }),
      this.prisma.marketingChannel.findMany({ where: { projectId }, select: { requirement: true, status: true } }),
      this.prisma.marketingContentItem.findMany({ where: { projectId }, select: { assetStatus: true, postStatus: true } }),
      this.prisma.marketingBuzzActivity.findMany({ where: { projectId }, orderBy: { startDate: 'asc' }, select: { stage: true, status: true, startDate: true, endDate: true } }),
      this.prisma.marketingGate.findMany({ where: { projectId }, select: { code: true, name: true, status: true } }),
      this.prisma.marketingSignoffItem.findMany({ where: { projectId }, select: { finalStatus: true } }),
    ]);
    if (!workspace) return { initialized: false };
    const applicable = tasks.filter((task) => task.status !== TaskStatus.N_A);
    const completed = applicable.filter((task) => task.status === TaskStatus.DONE).length;
    const requiredChannels = channelRows.filter((row) => row.requirement === 'REQUIRED');
    const sourceConfirmationRequired = tasks.filter((task) => !task.checklistTemplateItem?.sourceConfirmed).length;
    const eligibility = await this.gateEligibility(projectId);
    const resolvedGates = gateRows.map((row) => ({ ...row, eligible: Boolean(eligibility[row.code]), status: row.status === 'APPROVED' ? row.status : eligibility[row.code] ? 'READY_FOR_REVIEW' : 'NOT_READY' }));
    const marketingReady = sourceConfirmationRequired === 0 && applicable.length > 0 && completed === applicable.length && requiredChannels.every((row) => row.status === 'READY') && contentRows.length > 0 && contentRows.every((row) => row.assetStatus === 'READY') && gateRows.every((row) => row.status === 'APPROVED') && signoffRows.every((row) => row.finalStatus === 'READY');
    return {
      initialized: true, status: workspace.status, templateVersion: workspace.templateVersion, sourceConfirmationRequired,
      checklist: { totalApplicable: applicable.length, completed, inProgress: applicable.filter((t) => t.status === TaskStatus.IN_PROGRESS).length, ready: applicable.filter((t) => t.status === TaskStatus.READY).length, waiting: applicable.filter((t) => t.status === TaskStatus.WAITING).length, blocked: applicable.filter((t) => t.status === TaskStatus.BLOCKED).length, unassigned: applicable.filter((t) => !t.assigneeId).length, progress: applicable.length ? Math.round(applicable.reduce((sum, task) => sum + task.progress, 0) / applicable.length) : 0 },
      channels: { total: channelRows.length, requiredApplicable: requiredChannels.length, ready: channelRows.filter((r) => r.status === 'READY').length, blocked: channelRows.filter((r) => r.status === 'BLOCKED').length },
      contentBank: { total: contentRows.length, notStarted: contentRows.filter((r) => r.assetStatus === 'NOT_STARTED').length, inProduction: contentRows.filter((r) => r.assetStatus === 'IN_PRODUCTION').length, ready: contentRows.filter((r) => r.assetStatus === 'READY').length, blocked: contentRows.filter((r) => r.assetStatus === 'BLOCKED').length, scheduled: contentRows.filter((r) => r.postStatus === 'SCHEDULED').length, posted: contentRows.filter((r) => r.postStatus === 'POSTED').length },
      buzz: { currentStage: buzz.find((r) => r.status === 'IN_PROGRESS')?.stage || buzz.find((r) => r.status === 'NOT_STARTED')?.stage || null, nextWindow: buzz.find((r) => r.status === 'NOT_STARTED') || null },
      gates: resolvedGates, signoff: { ready: signoffRows.filter((r) => r.finalStatus === 'READY').length, pending: signoffRows.filter((r) => r.finalStatus === 'PENDING').length, fixRequired: signoffRows.filter((r) => r.finalStatus === 'FIX_REQUIRED').length }, marketingReadiness: marketingReady ? 'READY' : 'NOT_READY',
    };
  }

  async checklist(projectId: string, actor: AuthUser) { await this.project(projectId, actor); return this.prisma.task.findMany({ where: { projectId, workstream: 'MARKETING', deletedAt: null, ...(actor.globalRole === UserRole.TEAM_MEMBER ? { assigneeId: actor.id } : {}) }, include: { assignee: { select: publicUserSelect }, checklistTemplateItem: { select: { sourceConfirmed: true } } }, orderBy: { checklistOrder: 'asc' } }); }
  async channels(projectId: string, actor: AuthUser) { const project = await this.project(projectId, actor); if (!this.isManager(actor) && project.marketingOwnerId !== actor.id) throw new ForbiddenException('Marketing channel access requires management or Marketing Owner permission'); return this.prisma.marketingChannel.findMany({ where: { projectId }, include: { backupAdmin: { select: publicUserSelect } }, orderBy: { code: 'asc' } }); }
  async content(projectId: string, actor: AuthUser) { await this.project(projectId, actor); return this.prisma.marketingContentItem.findMany({ where: { projectId, ...(actor.globalRole === UserRole.TEAM_MEMBER ? { ownerId: actor.id } : {}) }, include: { owner: { select: publicUserSelect } }, orderBy: { code: 'asc' } }); }
  async buzz(projectId: string, actor: AuthUser) { await this.project(projectId, actor); return this.prisma.marketingBuzzActivity.findMany({ where: { projectId, ...(actor.globalRole === UserRole.TEAM_MEMBER ? { ownerId: actor.id } : {}) }, include: { owner: { select: publicUserSelect } }, orderBy: { startDate: 'asc' } }); }
  async gates(projectId: string, actor: AuthUser) { await this.project(projectId, actor); return this.prisma.marketingGate.findMany({ where: { projectId }, orderBy: { code: 'asc' } }); }
  async signoff(projectId: string, actor: AuthUser) { await this.project(projectId, actor); if (!this.isManager(actor)) throw new ForbiddenException('Sign-off details require management permission'); return this.prisma.marketingSignoffItem.findMany({ where: { projectId }, include: { owner: { select: publicUserSelect } }, orderBy: { code: 'asc' } }); }

  async bulkAssign(projectId: string, dto: MarketingAssignmentDto, actor: AuthUser) {
    requireManager(actor.globalRole); await this.project(projectId, actor);
    const mappings = dto.mappings || {}; const phaseMappings = dto.phaseMappings || {};
    const teamIds = [...new Set(dto.teamIds || [])];
    const ids = [...Object.values(mappings), ...Object.values(phaseMappings), dto.headId, ...teamIds].filter(Boolean) as string[];
    for (const id of new Set(ids)) await this.eligible(projectId, id);
    const tasks = await this.prisma.task.findMany({ where: { projectId, workstream: 'MARKETING', deletedAt: null }, select: { id: true, humanId: true, title: true, assigneeId: true, checklistOwnerRole: true, checklistPhase: true } });
    return this.prisma.$transaction(async (tx: any) => {
      let assignedCount = 0;
      let teamIndex = 0;
      const teamPhases = new Map<string, string>();
      if (dto.headId) await tx.project.update({ where: { id: projectId }, data: { marketingOwnerId: dto.headId } });
      for (const task of tasks) {
        const phaseOwner = task.checklistPhase && phaseMappings[task.checklistPhase];
        if (task.assigneeId && !phaseOwner) continue;
        const coordinationTask = ['MARKETING_LEAD', 'PROJECT_MANAGER'].includes(task.checklistOwnerRole);
        const phase = task.checklistPhase || task.id;
        if (!teamPhases.has(phase) && teamIds.length) teamPhases.set(phase, teamIds[teamIndex++ % teamIds.length]);
        const assigneeId = phaseOwner || (task.checklistOwnerRole && mappings[task.checklistOwnerRole]) || (coordinationTask ? dto.headId : teamPhases.get(phase));
        if (!assigneeId || assigneeId === task.assigneeId) continue;
        await tx.task.update({ where: { id: task.id }, data: { assigneeId, ...(!task.assigneeId ? { status: TaskStatus.READY } : {}) } });
        await tx.notification.create({ data: { userId: assigneeId, type: NotificationType.TASK_ASSIGNED, title: 'Marketing work assigned', message: `${task.humanId}: ${task.title}`, linkUrl: `/projects/${projectId}/marketing` } });
        assignedCount++;
      }
      await this.audit(tx, actor.id, 'MARKETING_ITEM_ASSIGNED', 'Project', projectId, { assignedCount });
      return { success: true, assignedCount };
    });
  }

  async assignItem(projectId: string, id: string, dto: AssignMarketingItemDto, actor: AuthUser) {
    requireManager(actor.globalRole); await this.project(projectId, actor); await this.eligible(projectId, dto.assigneeId);
    const task = await this.prisma.task.findFirst({ where: { id, projectId, workstream: 'MARKETING', deletedAt: null } });
    if (!task) throw new NotFoundException('Marketing checklist item not found');
    return this.prisma.$transaction(async (tx: any) => {
      const assigneeId = dto.assigneeId || null;
      const updated = await tx.task.update({ where: { id }, data: { assigneeId, status: assigneeId ? TaskStatus.READY : TaskStatus.UNASSIGNED, dueDate: dto.dueDate === undefined ? undefined : dto.dueDate ? new Date(dto.dueDate) : null, progress: 0 } });
      if (assigneeId) await tx.notification.create({ data: { userId: assigneeId, type: NotificationType.TASK_ASSIGNED, title: 'Marketing work assigned', message: `${task.humanId}: ${task.title}`, linkUrl: `/projects/${projectId}/marketing` } });
      await this.audit(tx, actor.id, task.assigneeId ? 'MARKETING_ITEM_REASSIGNED' : 'MARKETING_ITEM_ASSIGNED', 'Task', id, { assigneeId });
      return updated;
    });
  }

  async updateChannel(projectId: string, id: string, dto: UpdateChannelDto, actor: AuthUser) { const project = await this.project(projectId, actor); if (!this.isManager(actor) && project.marketingOwnerId !== actor.id) throw new ForbiddenException('Channel update permission denied'); await this.eligible(projectId, dto.backupAdminId); return this.prisma.$transaction(async (tx: any) => { const row = await tx.marketingChannel.update({ where: { id, projectId }, data: { ...dto, backupAdminId: dto.backupAdminId || null } }); await this.audit(tx, actor.id, 'CHANNEL_REGISTRY_UPDATED', 'MarketingChannel', id, { status: row.status }); return row; }); }
  async updateContent(projectId: string, id: string, dto: UpdateContentDto, actor: AuthUser) { await this.project(projectId, actor); const row = await this.prisma.marketingContentItem.findFirst({ where: { id, projectId } }); if (!row) throw new NotFoundException('Content item not found'); if (!this.isManager(actor) && row.ownerId !== actor.id) throw new ForbiddenException('Content update permission denied'); if (!this.isManager(actor) && dto.ownerId !== undefined) throw new ForbiddenException('Only management can change the owner'); await this.eligible(projectId, dto.ownerId); return this.prisma.$transaction(async (tx: any) => { const updated = await tx.marketingContentItem.update({ where: { id }, data: { ...dto, ownerId: dto.ownerId === undefined ? undefined : dto.ownerId || null, targetDate: dto.targetDate === undefined ? undefined : dto.targetDate ? new Date(dto.targetDate) : null, scheduledDate: dto.scheduledDate === undefined ? undefined : dto.scheduledDate ? new Date(dto.scheduledDate) : null } }); await this.audit(tx, actor.id, 'CONTENT_ITEM_UPDATED', 'MarketingContentItem', id, { assetStatus: updated.assetStatus, postStatus: updated.postStatus }); return updated; }); }
  async updateBuzz(projectId: string, id: string, dto: UpdateBuzzDto, actor: AuthUser) { await this.project(projectId, actor); const row = await this.prisma.marketingBuzzActivity.findFirst({ where: { id, projectId } }); if (!row) throw new NotFoundException('Buzz activity not found'); if (!this.isManager(actor) && row.ownerId !== actor.id) throw new ForbiddenException('Buzz update permission denied'); if (!this.isManager(actor) && dto.ownerId !== undefined) throw new ForbiddenException('Only management can change the owner'); await this.eligible(projectId, dto.ownerId); return this.prisma.$transaction(async (tx: any) => { const updated = await tx.marketingBuzzActivity.update({ where: { id }, data: { ...dto, ownerId: dto.ownerId === undefined ? undefined : dto.ownerId || null } }); await this.audit(tx, actor.id, 'BUZZ_ACTIVITY_UPDATED', 'MarketingBuzzActivity', id, { status: updated.status }); return updated; }); }
  async approveGate(projectId: string, id: string, _dto: ApproveGateDto, actor: AuthUser) { requireManager(actor.globalRole); await this.project(projectId, actor); const gate = await this.prisma.marketingGate.findFirst({ where: { id, projectId } }); if (!gate) throw new NotFoundException('Marketing gate not found'); const eligibility = await this.gateEligibility(projectId); if (!eligibility[gate.code]) throw new BadRequestException(`${gate.name} is not ready for approval`); return this.prisma.$transaction(async (tx: any) => { const updated = await tx.marketingGate.update({ where: { id }, data: { status: 'APPROVED', approvedById: actor.id, approvedAt: new Date() } }); await this.audit(tx, actor.id, 'MARKETING_GATE_APPROVED', 'MarketingGate', id); return updated; }); }
  async updateSignoff(projectId: string, id: string, dto: UpdateSignoffDto, actor: AuthUser) { requireManager(actor.globalRole); await this.project(projectId, actor); await this.eligible(projectId, dto.ownerId); const existing = await this.prisma.marketingSignoffItem.findFirst({ where: { id, projectId } }); if (!existing) throw new NotFoundException('Marketing sign-off item not found'); const marketingCheck = dto.marketingCheck ?? existing.marketingCheck; const pmCheck = dto.pmCheck ?? existing.pmCheck; const finalStatus = marketingCheck === 'FIX_REQUIRED' || pmCheck === 'FIX_REQUIRED' ? 'FIX_REQUIRED' : marketingCheck === 'VERIFIED' && pmCheck === 'VERIFIED' ? 'READY' : marketingCheck === 'N_A' && pmCheck === 'N_A' ? 'READY' : 'PENDING'; return this.prisma.$transaction(async (tx: any) => { const row = await tx.marketingSignoffItem.update({ where: { id }, data: { ...dto, ownerId: dto.ownerId === undefined ? undefined : dto.ownerId || null, targetFixDate: dto.targetFixDate === undefined ? undefined : dto.targetFixDate ? new Date(dto.targetFixDate) : null, finalStatus } }); await this.audit(tx, actor.id, 'MARKETING_SIGNOFF_UPDATED', 'MarketingSignoffItem', id, { finalStatus }); return row; }); }

  async reschedulePreview(projectId: string, targetDate: string, actor: AuthUser) {
    requireManager(actor.globalRole); await this.project(projectId, actor);
    const launch = new Date(targetDate); if (Number.isNaN(launch.getTime())) throw new BadRequestException('A valid target launch date is required');
    const rows = await this.prisma.marketingBuzzActivity.findMany({ where: { projectId, status: { not: 'DONE' } }, orderBy: { startDate: 'asc' } });
    return rows.map((row) => { const startDate = new Date(launch); startDate.setUTCDate(startDate.getUTCDate() + row.startOffsetDays); const endDate = new Date(launch); endDate.setUTCDate(endDate.getUTCDate() + row.endOffsetDays); return { id: row.id, code: row.code, stage: row.stage, oldStartDate: row.startDate, oldEndDate: row.endDate, startDate, endDate }; });
  }

  async reschedule(projectId: string, targetDate: string, actor: AuthUser) {
    requireManager(actor.globalRole); await this.project(projectId, actor); const launch = new Date(targetDate); if (Number.isNaN(launch.getTime())) throw new BadRequestException('A valid target launch date is required');
    const preview = await this.reschedulePreview(projectId, targetDate, actor);
    return this.prisma.$transaction(async (tx: any) => { await tx.project.update({ where: { id: projectId }, data: { targetDate: launch } }); for (const row of preview) await tx.marketingBuzzActivity.update({ where: { id: row.id }, data: { startDate: row.startDate, endDate: row.endDate } }); await this.audit(tx, actor.id, 'LAUNCH_DATE_RESCHEDULED', 'Project', projectId, { targetDate: launch.toISOString(), shiftedActivities: preview.length, completedActivitiesPreserved: true }); return { success: true, targetDate: launch, shiftedActivities: preview.length }; });
  }
}
