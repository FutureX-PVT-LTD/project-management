import { ProjectsService } from './projects.service';

describe('ProjectsService marketing assignment eligibility', () => {
  const findFirst = jest.fn();
  const service = new ProjectsService(
    { projectMember: { findFirst } } as never,
    {} as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects a Product Team member without an active Marketing role', async () => {
    findFirst.mockResolvedValue({ projectRoles: [] });

    await expect(
      (service as any).ensureEligibleWorkstreamAssignee(
        'project-1',
        'member-1',
        'MARKETING',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'ASSIGNEE_ROLE_MISMATCH' }),
    });
  });

  it('accepts a Product Team member with an active Marketing role', async () => {
    findFirst.mockResolvedValue({
      projectRoles: [
        {
          functionalRole: {
            code: 'MARKETING_EXECUTIVE',
            isActive: true,
          },
        },
      ],
    });

    await expect(
      (service as any).ensureEligibleWorkstreamAssignee(
        'project-1',
        'member-1',
        'MARKETING',
      ),
    ).resolves.toBeUndefined();
  });

  it('does not apply the Marketing role restriction to Development work', async () => {
    findFirst.mockResolvedValue({ projectRoles: [] });

    await expect(
      (service as any).ensureEligibleWorkstreamAssignee(
        'project-1',
        'member-1',
        'DEVELOPMENT',
      ),
    ).resolves.toBeUndefined();
  });
});
