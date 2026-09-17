import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@futurex/shared';
import { UsersService } from './users.service';

describe('UsersService.remove', () => {
  const countResult = { count: 0 };

  function setup(user: { id: string; email: string; globalRole: string; isActive: boolean }) {
    const tx = {
      task: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      project: { updateMany: jest.fn().mockResolvedValue(countResult) },
      projectPhaseAssignment: { updateMany: jest.fn().mockResolvedValue(countResult) },
      projectPhaseMember: { deleteMany: jest.fn().mockResolvedValue(countResult) },
      marketingChannel: { updateMany: jest.fn().mockResolvedValue(countResult) },
      marketingContentItem: { updateMany: jest.fn().mockResolvedValue(countResult) },
      marketingBuzzActivity: { updateMany: jest.fn().mockResolvedValue(countResult) },
      marketingSignoffItem: { updateMany: jest.fn().mockResolvedValue(countResult) },
      projectMember: { deleteMany: jest.fn().mockResolvedValue(countResult) },
      teamMember: { deleteMany: jest.fn().mockResolvedValue(countResult) },
      session: { updateMany: jest.fn().mockResolvedValue(countResult) },
      user: { update: jest.fn().mockResolvedValue(user) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(user) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    return { service: new UsersService(prisma as never), prisma, tx };
  }

  it('requires the account to be deactivated first', async () => {
    const { service, prisma } = setup({ id: 'member-1', email: 'member@example.com', globalRole: UserRole.TEAM_MEMBER, isActive: true });

    await expect(service.remove('member-1', 'owner-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('protects the current user and Super Admin accounts', async () => {
    const self = setup({ id: 'owner-1', email: 'owner@example.com', globalRole: UserRole.OWNER, isActive: false });
    await expect(self.service.remove('owner-1', 'owner-1')).rejects.toBeInstanceOf(ForbiddenException);

    const owner = setup({ id: 'owner-2', email: 'owner2@example.com', globalRole: UserRole.OWNER, isActive: false });
    await expect(owner.service.remove('owner-2', 'owner-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('soft deletes an inactive member and releases open assignments', async () => {
    const { service, tx } = setup({ id: 'member-1', email: 'member@example.com', globalRole: UserRole.TEAM_MEMBER, isActive: false });

    const result = await service.remove('member-1', 'owner-1');

    expect(tx.task.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ assigneeId: 'member-1' }),
      data: { assigneeId: null },
    }));
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: expect.objectContaining({ isActive: false, deletedAt: expect.any(Date) }),
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'USER_DELETED' }) });
    expect(result.released.tasks).toBe(2);
  });
});
