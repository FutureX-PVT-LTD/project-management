import { Module, Controller, Get, Post, Patch, Body, Param, Query, NotFoundException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, UserRole } from '@futurex/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Actor, projectScope, requireProject, publicUserSelect } from '../../common/security/access-policy';
import { CreateAdditionalWorkDto, EditAdditionalWorkDto } from './additional-work.dto';

const selection = {
  id: true, projectId: true, creatorId: true, title: true, description: true,
  workDate: true, minutesSpent: true, workstream: true, source: true, countsTowardProductProgress: true,
  createdAt: true, updatedAt: true,
  project: { select: { id: true, name: true } }, creator: { select: publicUserSelect },
} as const;

@Injectable()
export class AdditionalWorkService {
  constructor(private prisma: PrismaService) {}

  private scope(actor: Actor) {
    return { project: projectScope(actor), ...(actor.globalRole === UserRole.TEAM_MEMBER ? { creatorId: actor.id } : {}) };
  }

  async list(actor: Actor, projectId?: string) {
    return this.prisma.additionalWork.findMany({
      where: { ...this.scope(actor), ...(projectId ? { projectId } : {}) },
      select: selection, orderBy: [{ workDate: 'desc' }, { id: 'desc' }], take: 100,
    });
  }

  async detail(id: string, actor: Actor) {
    const log = await this.prisma.additionalWork.findFirst({ where: { id, ...this.scope(actor) }, select: selection });
    if (!log) throw new NotFoundException('Work log not found');
    return log;
  }

  private async requireParticipation(projectId: string, actor: Actor) {
    await requireProject(this.prisma, projectId, actor);
    const member = await this.prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId: actor.id } } });
    if (!member) throw new NotFoundException('Project membership required');
  }

  async create(dto: CreateAdditionalWorkDto, actor: Actor) {
    await this.requireParticipation(dto.projectId, actor);
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.additionalWork.create({ data: {
        projectId: dto.projectId, creatorId: actor.id, title: dto.title.trim(),
        description: dto.description.trim(), workDate: new Date(dto.workDate), minutesSpent: dto.minutesSpent, workstream: dto.workstream || 'DEVELOPMENT',
        source: 'MEMBER_ADDITIONAL_WORK', countsTowardProductProgress: false,
      }, select: selection });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'ADDITIONAL_WORK_LOGGED', entityType: 'AdditionalWork', entityId: log.id } });
      return log;
    });
  }

  async update(id: string, dto: EditAdditionalWorkDto, actor: Actor) {
    const existing = await this.detail(id, actor);
    if (existing.creatorId !== actor.id) throw new NotFoundException('Work log not found');
    await this.requireParticipation(existing.projectId, actor);
    return this.prisma.$transaction(async (tx) => {
      const log = await tx.additionalWork.update({ where: { id, creatorId: actor.id }, data: {
        title: dto.title.trim(), description: dto.description.trim(), workDate: new Date(dto.workDate), minutesSpent: dto.minutesSpent ?? null, workstream: dto.workstream || existing.workstream,
      }, select: selection });
      await tx.auditLog.create({ data: { actorId: actor.id, action: 'ADDITIONAL_WORK_UPDATED', entityType: 'AdditionalWork', entityId: id } });
      return log;
    });
  }
}

@Controller('additional-work')
export class AdditionalWorkController {
  constructor(private service: AdditionalWorkService) {}
  @Get() list(@CurrentUser() actor: AuthUser, @Query('projectId') projectId?: string) { return this.service.list(actor, projectId); }
  @Get(':id') detail(@Param('id') id: string, @CurrentUser() actor: AuthUser) { return this.service.detail(id, actor); }
  @Post() create(@Body() dto: CreateAdditionalWorkDto, @CurrentUser() actor: AuthUser) { return this.service.create(dto, actor); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: EditAdditionalWorkDto, @CurrentUser() actor: AuthUser) { return this.service.update(id, dto, actor); }
}

@Module({ controllers: [AdditionalWorkController], providers: [AdditionalWorkService] })
export class AdditionalWorkModule {}
