import { UserRole } from '@futurex/shared';
import { MarketingService } from './marketing.service';

const actor = (id: string) => ({ id, globalRole: UserRole.TEAM_MEMBER } as any);
const admin = (id: string) => ({ id, globalRole: UserRole.ADMIN } as any);
const roleMembership = (code: string) => ({
  projectRoles: [{ functionalRole: { code, isActive: true } }],
});

describe('Marketing operational permissions', () => {
  function setup(roleCode: string) {
    const tx = {
      marketingChannel: { update: jest.fn() },
      marketingContentItem: { update: jest.fn() },
      marketingBuzzActivity: { update: jest.fn() },
      marketingSignoffItem: { update: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit' }) },
    };
    const prisma = {
      projectMember: {
        findUnique: jest.fn().mockResolvedValue(roleMembership(roleCode)),
        findFirst: jest.fn().mockResolvedValue({ id: 'membership' }),
      },
      marketingChannel: { findFirst: jest.fn() },
      marketingContentItem: { findFirst: jest.fn() },
      marketingBuzzActivity: { findFirst: jest.fn() },
      marketingSignoffItem: { findFirst: jest.fn() },
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'member' }) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const service = new MarketingService(prisma as any);
    jest.spyOn(service as any, 'project').mockResolvedValue({ id: 'project' });
    return { service, prisma, tx };
  }

  it('lets a Marketing Executive update content assigned to them', async () => {
    const { service, prisma, tx } = setup('MARKETING_EXECUTIVE');
    prisma.marketingContentItem.findFirst.mockResolvedValue({
      id: 'content', ownerId: 'executive', assetStatus: 'NOT_STARTED', postStatus: 'NOT_POSTED',
    });
    tx.marketingContentItem.update.mockResolvedValue({
      id: 'content', ownerId: 'executive', assetStatus: 'IN_PRODUCTION', postStatus: 'NOT_POSTED',
    });

    await service.updateContent('project', 'content', { assetStatus: 'IN_PRODUCTION' }, actor('executive'));

    expect(tx.marketingContentItem.update).toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'CONTENT_ITEM_UPDATED' }) });
  });

  it('prevents a Marketing Executive from updating another owner’s content', async () => {
    const { service, prisma, tx } = setup('MARKETING_EXECUTIVE');
    prisma.marketingContentItem.findFirst.mockResolvedValue({
      id: 'content', ownerId: 'someone-else', assetStatus: 'NOT_STARTED', postStatus: 'NOT_POSTED',
    });

    await expect(service.updateContent('project', 'content', { assetStatus: 'READY' }, actor('executive')))
      .rejects.toThrow('Content update permission denied');
    expect(tx.marketingContentItem.update).not.toHaveBeenCalled();
  });

  it('prevents an Admin from updating an assigned member\'s content progress', async () => {
    const { service, prisma, tx } = setup('MARKETING_MANAGER');
    prisma.marketingContentItem.findFirst.mockResolvedValue({
      id: 'content', ownerId: 'executive', assetStatus: 'NOT_STARTED', postStatus: 'NOT_POSTED',
    });

    await expect(service.updateContent('project', 'content', { assetStatus: 'READY' }, admin('admin')))
      .rejects.toThrow('Only the assigned Marketing member can update Content progress');
    expect(tx.marketingContentItem.update).not.toHaveBeenCalled();
  });

  it('prevents the Marketing Head from updating another owner\'s content progress', async () => {
    const { service, prisma, tx } = setup('MARKETING_MANAGER');
    prisma.marketingContentItem.findFirst.mockResolvedValue({
      id: 'content', ownerId: 'executive', assetStatus: 'NOT_STARTED', postStatus: 'NOT_POSTED',
    });

    await expect(service.updateContent('project', 'content', { assetStatus: 'READY' }, actor('head')))
      .rejects.toThrow('Content update permission denied');
    expect(tx.marketingContentItem.update).not.toHaveBeenCalled();
  });

  it('prevents the Marketing Head from changing assignments', async () => {
    const { service, prisma, tx } = setup('MARKETING_MANAGER');
    prisma.marketingChannel.findFirst.mockResolvedValue({ id: 'channel', ownerId: null, status: 'NOT_CREATED' });

    await expect(service.updateChannel('project', 'channel', { ownerId: 'executive' }, actor('head')))
      .rejects.toThrow('Only Admin or Super Admin can change Marketing assignments');
    expect(tx.marketingChannel.update).not.toHaveBeenCalled();
  });

  it('lets an Admin assign an eligible Marketing Product Team member', async () => {
    const { service, prisma, tx } = setup('MARKETING_MANAGER');
    prisma.marketingChannel.findFirst.mockResolvedValue({ id: 'channel', ownerId: null, status: 'NOT_CREATED' });
    tx.marketingChannel.update.mockResolvedValue({ id: 'channel', ownerId: 'member', status: 'NOT_CREATED' });

    await service.updateChannel('project', 'channel', { ownerId: 'member' }, admin('admin'));

    expect(prisma.projectMember.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ user: { isActive: true, deletedAt: null, globalRole: 'TEAM_MEMBER' }, projectRoles: expect.any(Object) }),
    }));
    expect(tx.marketingChannel.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ownerId: 'member' }),
    }));
  });

  it('rejects a request that mixes assignment and progress changes', async () => {
    const { service, prisma, tx } = setup('MARKETING_MANAGER');
    prisma.marketingContentItem.findFirst.mockResolvedValue({
      id: 'content', ownerId: null, assetStatus: 'NOT_STARTED', postStatus: 'NOT_POSTED',
    });

    await expect(service.updateContent(
      'project',
      'content',
      { ownerId: 'member', assetStatus: 'IN_PRODUCTION' },
      admin('admin'),
    )).rejects.toThrow('Update Marketing assignments and work progress separately');
    expect(tx.marketingContentItem.update).not.toHaveBeenCalled();
  });

  it('lets a Marketing Coordinator update an assigned Buzz window', async () => {
    const { service, prisma, tx } = setup('MARKETING_COORDINATOR');
    prisma.marketingBuzzActivity.findFirst.mockResolvedValue({ id: 'buzz', ownerId: 'coordinator', status: 'NOT_STARTED' });
    tx.marketingBuzzActivity.update.mockResolvedValue({ id: 'buzz', ownerId: 'coordinator', status: 'IN_PROGRESS' });

    await service.updateBuzz('project', 'buzz', { status: 'IN_PROGRESS' }, actor('coordinator'));

    expect(tx.marketingBuzzActivity.update).toHaveBeenCalled();
  });

  it('keeps the PM sign-off check restricted to Admin and Super Admin', async () => {
    const { service, tx } = setup('MARKETING_MANAGER');

    await expect(service.updateSignoff('project', 'signoff', { pmCheck: 'VERIFIED' }, actor('head')))
      .rejects.toThrow('Only Admin or Super Admin');
    expect(tx.marketingSignoffItem.update).not.toHaveBeenCalled();
  });
});
