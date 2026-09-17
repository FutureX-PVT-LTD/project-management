import { MarketingService } from './marketing.service';
import { UserRole } from '@futurex/shared';

describe('Marketing team assignments', () => {
  it('rejects the retired duplicate Marketing assignment endpoint', async () => {
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
    await expect(service.bulkAssign('project', { headId: 'lead' }, { id: 'admin', globalRole: UserRole.ADMIN } as any)).rejects.toThrow('shared Product Assignment workspace');
    expect(tx.task.update).not.toHaveBeenCalled();
  });
});
