import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../modules/prisma/prisma.service';

export const MARKETING_ROLE_CODES = ['MARKETING_MANAGER', 'MARKETING_EXECUTIVE', 'MARKETING_COORDINATOR'];

export async function requireMarketingAssignee(prisma: PrismaService, projectId: string, userId: string) {
  const member = await prisma.projectMember.findFirst({
    where: {
      projectId, userId,
      user: { isActive: true, deletedAt: null, globalRole: 'TEAM_MEMBER' },
      projectRoles: { some: { functionalRole: { isActive: true, code: { in: MARKETING_ROLE_CODES } } } },
    },
    select: { id: true },
  });
  if (!member) throw new BadRequestException({
    code: 'ASSIGNEE_ROLE_MISMATCH',
    message: 'Select an active Product Team member with a Marketing Head, Executive or Coordinator project role. Administrators manage assignments, not Marketing progress.',
  });
}
