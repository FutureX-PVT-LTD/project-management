import { TaskStatus } from '@futurex/shared';
import { ProjectsService } from './projects.service';

describe('Project overview progress', () => {
  it('orders phases by checklist position and reports completed work', () => {
    const service = new ProjectsService({} as never, {} as never);
    const tasks = [
      {
        workType: 'STANDARD_CHECKLIST',
        checklistPhase: '8. Store & Compliance',
        checklistOrder: 34,
        status: TaskStatus.IN_PROGRESS,
        assigneeId: 'member-1',
      },
      {
        workType: 'STANDARD_CHECKLIST',
        checklistPhase: '1. Concept',
        checklistOrder: 1,
        status: TaskStatus.DONE,
        assigneeId: 'member-2',
      },
      {
        workType: 'STANDARD_CHECKLIST',
        checklistPhase: '1. Concept',
        checklistOrder: 2,
        status: TaskStatus.READY,
        assigneeId: 'member-2',
      },
    ];

    const phases = (service as any).calculatePhaseProgress(tasks);

    expect(phases.map((phase: any) => phase.phase)).toEqual([
      '1. Concept',
      '8. Store & Compliance',
    ]);
    expect(phases[0]).toEqual(expect.objectContaining({
      completed: 1,
      hasStarted: true,
      totalApplicable: 2,
      progress: 50,
    }));
    expect(phases[1]).toEqual(expect.objectContaining({
      inProgress: 1,
      hasStarted: true,
      progress: 0,
    }));
  });
});
