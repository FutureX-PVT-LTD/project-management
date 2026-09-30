import { ProjectsService } from './projects.service';

describe('ProjectsService Marketing assignment eligibility', () => {
  const findFirst = jest.fn();
  const service = new ProjectsService(
    { projectMember: { findFirst } } as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a user who is not an active Product Team member', async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      (service as any).ensureActiveProductMember(
        'project-1',
        'member-1',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'INVALID_PRODUCT_ASSIGNEE' }),
    });
  });

  it('accepts an active Product Team member without requiring a Marketing role', async () => {
    findFirst.mockResolvedValue({ id: 'membership-1' });

    await expect(
      (service as any).ensureActiveProductMember(
        'project-1',
        'member-1',
      ),
    ).resolves.toBeUndefined();
  });
});
