import { BadRequestException } from '@nestjs/common';
import { ProjectMemberRole, UserRole } from '@futurex/shared';
import { ProjectsService } from './projects.service';

describe('ProjectsService Product member roles', () => {
  function addMemberSetup() {
    const member = {
      id: 'membership-1',
      projectRoles: [
        {
          functionalRole: {
            id: 'marketing-role',
            code: 'MARKETING_MANAGER',
            name: 'Marketing Head',
          },
        },
      ],
    };
    const tx = {
      projectMember: {
        upsert: jest.fn().mockResolvedValue({ id: 'membership-1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(member),
      },
      projectMemberRoleAssignment: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const prisma = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'project-1',
          name: 'Product',
          key: 'PX',
          members: [],
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'member-1',
          isActive: true,
          globalRole: UserRole.TEAM_MEMBER,
          functionalRoleLinks: [{ functionalRoleId: 'marketing-role' }],
        }),
      },
      userFunctionalRole: { count: jest.fn().mockResolvedValue(1) },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    return { service: new ProjectsService(prisma as never, {} as never), prisma, tx, member };
  }

  it('copies active account roles when a legacy add-member request omits role IDs', async () => {
    const { service, tx, member } = addMemberSetup();

    const result = await service.addMember(
      'project-1',
      'member-1',
      ProjectMemberRole.MEMBER,
      'owner-1',
      UserRole.OWNER,
    );

    expect(tx.projectMemberRoleAssignment.createMany).toHaveBeenCalledWith({
      data: [{ projectMemberId: 'membership-1', functionalRoleId: 'marketing-role' }],
      skipDuplicates: true,
    });
    expect(result).toMatchObject(member);
  });

  it('respects an explicit empty Product role selection', async () => {
    const { service, prisma, tx } = addMemberSetup();
    prisma.userFunctionalRole.count.mockResolvedValue(0);

    await service.addMember(
      'project-1',
      'member-1',
      ProjectMemberRole.MEMBER,
      'owner-1',
      UserRole.OWNER,
      [],
    );

    expect(tx.projectMemberRoleAssignment.createMany).not.toHaveBeenCalled();
  });

  it('blocks removing the last Marketing role while active Marketing work is assigned', async () => {
    const tx = {
      projectMemberRoleAssignment: { deleteMany: jest.fn(), createMany: jest.fn() },
      auditLog: { create: jest.fn() },
      projectMember: { findUniqueOrThrow: jest.fn() },
    };
    const prisma = {
      projectMember: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'membership-1',
          projectRoles: [
            {
              functionalRoleId: 'marketing-role',
              functionalRole: { code: 'MARKETING_MANAGER' },
            },
          ],
        }),
      },
      userFunctionalRole: { count: jest.fn().mockResolvedValue(0) },
      task: {
        findMany: jest.fn().mockResolvedValue([
          { workstream: 'MARKETING', checklistTemplateItem: null },
        ]),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new ProjectsService(prisma as never, {} as never);

    await expect(
      service.updateMemberRoles(
        'project-1',
        'member-1',
        [],
        'owner-1',
        UserRole.OWNER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
