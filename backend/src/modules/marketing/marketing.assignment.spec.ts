import { MarketingService } from './marketing.service';
import { UserRole } from '@futurex/shared';

describe('Marketing team assignments', () => {
  it('distributes execution work, assigns coordination to the head and preserves existing owners', async () => {
    const tx = {
      project: { update: jest.fn() },
      task: { update: jest.fn() },
      notification: { create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue({ id: 'member' }) },
      task: { findMany: jest.fn().mockResolvedValue([
        { id: 'one', checklistOwnerRole: 'MARKETING_ASSISTANT', checklistPhase: 'Identity', assigneeId: 'old' },
        { id: 'two', checklistOwnerRole: 'WEB_MARKETING', checklistPhase: 'Identity' },
        { id: 'three', checklistOwnerRole: 'MARKETING_TEAM', checklistPhase: 'Ownership' },
        { id: 'head', checklistOwnerRole: 'MARKETING_LEAD' },
        { id: 'existing', assigneeId: 'original' },
      ]) },
      $transaction: (callback: any) => callback(tx),
    };
    const service = new MarketingService(prisma as any);
    jest.spyOn(service as any, 'project').mockResolvedValue({ id: 'project' });
    const result = await service.bulkAssign('project', { headId: 'lead', phaseMappings: { Identity: 'a', Ownership: 'b' } }, { id: 'admin', globalRole: UserRole.ADMIN } as any);
    expect(result.assignedCount).toBe(4);
    expect(tx.task.update.mock.calls.map(([args]) => [args.where.id, args.data.assigneeId])).toEqual([
      ['one', 'a'], ['two', 'a'], ['three', 'b'], ['head', 'lead'],
    ]);
    expect(tx.project.update).toHaveBeenCalledWith({ where: { id: 'project' }, data: { marketingOwnerId: 'lead' } });
    expect(tx.task.update.mock.calls[0][0].data).toEqual({ assigneeId: 'a' });
  });
});
