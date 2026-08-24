import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMilestoneDto, UpdateMilestoneDto } from './dto/create-milestone.dto';
import { MilestoneStatus } from '@futurex/shared';

@Injectable()
export class MilestonesService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string) {
    const milestones = await this.prisma.milestone.findMany({
      where: { projectId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
      orderBy: { orderIndex: 'asc' },
    });

    return milestones.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      name: m.name,
      description: m.description,
      targetDate: m.targetDate.toISOString(),
      status: m.status as MilestoneStatus,
      progress: m.progress,
      orderIndex: m.orderIndex,
      tasksCount: m.tasks.length,
      completedTasksCount: m.tasks.filter((t) => t.status === 'DONE').length,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    }));
  }

  async create(dto: CreateMilestoneDto) {
    const milestone = await this.prisma.milestone.create({
      data: {
        projectId: dto.projectId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        targetDate: new Date(dto.targetDate),
        status: dto.status || MilestoneStatus.PLANNED,
        orderIndex: dto.orderIndex || 0,
      },
    });

    return milestone;
  }

  async update(id: string, dto: UpdateMilestoneDto) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    return this.prisma.milestone.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        status: dto.status,
        orderIndex: dto.orderIndex,
      },
    });
  }

  async delete(id: string) {
    const milestone = await this.prisma.milestone.findUnique({ where: { id } });
    if (!milestone) throw new NotFoundException('Milestone not found');

    await this.prisma.milestone.delete({ where: { id } });
    return { success: true, message: 'Milestone deleted' };
  }

  async updateMilestoneProgress(milestoneId: string) {
    const tasks = await this.prisma.task.findMany({
      where: { milestoneId, deletedAt: null, status: { notIn: ['CANCELED'] } },
      select: { status: true, progress: true },
    });

    if (tasks.length === 0) return 0;

    const completed = tasks.filter((t) => t.status === 'DONE').length;
    const progress = Math.round((completed / tasks.length) * 100);

    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        progress,
        status: progress === 100 ? MilestoneStatus.COMPLETED : MilestoneStatus.IN_PROGRESS,
      },
    });

    return progress;
  }
}
