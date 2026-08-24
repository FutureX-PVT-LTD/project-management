import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, UserRole } from '@futurex/shared';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const teams = await this.prisma.team.findMany({
      include: {
        leadUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
            jobTitle: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                jobTitle: true,
                globalRole: true,
                assignedTasks: {
                  where: {
                    deletedAt: null,
                    status: { notIn: ['DONE', 'CANCELED'] },
                  },
                  select: {
                    id: true,
                    status: true,
                    estimatedHours: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      leadUserId: t.leadUserId,
      leadUser: t.leadUser,
      membersCount: t.members.length,
      members: t.members.map((m) => {
        const activeTasks = m.user.assignedTasks.length;
        const blockedTasks = m.user.assignedTasks.filter((task) => task.status === 'BLOCKED').length;
        const workloadHours = m.user.assignedTasks.reduce(
          (sum, task) => sum + (task.estimatedHours || 0),
          0,
        );

        let capacityLevel: 'AVAILABLE' | 'BALANCED' | 'HIGH' = 'BALANCED';
        if (workloadHours < 15) capacityLevel = 'AVAILABLE';
        else if (workloadHours > 35) capacityLevel = 'HIGH';

        return {
          id: m.user.id,
          firstName: m.user.firstName,
          lastName: m.user.lastName,
          email: m.user.email,
          avatarUrl: m.user.avatarUrl,
          jobTitle: m.user.jobTitle,
          globalRole: m.user.globalRole as UserRole,
          activeTasksCount: activeTasks,
          blockedTasksCount: blockedTasks,
          estimatedWorkloadHours: workloadHours,
          capacityLevel,
        };
      }),
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  }

  async findById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        leadUser: true,
        members: {
          include: { user: true },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async create(dto: CreateTeamDto) {
    const existing = await this.prisma.team.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new BadRequestException('A team with this name already exists');
    }

    const team = await this.prisma.team.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        leadUserId: dto.leadUserId,
        members: dto.memberUserIds?.length
          ? {
              create: dto.memberUserIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: {
        leadUser: true,
        members: { include: { user: true } },
      },
    });

    return team;
  }

  async update(id: string, dto: Partial<CreateTeamDto>) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (dto.memberUserIds !== undefined) {
      await this.prisma.teamMember.deleteMany({ where: { teamId: id } });
      if (dto.memberUserIds.length > 0) {
        await this.prisma.teamMember.createMany({
          data: dto.memberUserIds.map((userId) => ({ teamId: id, userId })),
        });
      }
    }

    return this.prisma.team.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        description: dto.description?.trim(),
        leadUserId: dto.leadUserId !== undefined ? dto.leadUserId : undefined,
      },
      include: {
        leadUser: true,
        members: { include: { user: true } },
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.team.delete({ where: { id } });
    return { success: true, message: 'Team deleted' };
  }
}
