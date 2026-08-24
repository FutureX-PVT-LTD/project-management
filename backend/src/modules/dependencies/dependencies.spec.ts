import { DependencyGraphUtil } from '../../common/utils/dependency-graph.util';

describe('DependencyGraphUtil (Cycle Detection & Finish-to-Start Rules)', () => {
  it('should detect direct self-dependency as invalid cycle', () => {
    const isCycle = DependencyGraphUtil.wouldCreateCycle([], 'task-1', 'task-1');
    expect(isCycle).toBe(true);
  });

  it('should allow valid linear chain: A -> B -> C', () => {
    const edges = [
      { predecessorTaskId: 'task-A', dependentTaskId: 'task-B' },
    ];
    // Adding B -> C should NOT cycle
    const isCycle = DependencyGraphUtil.wouldCreateCycle(edges, 'task-B', 'task-C');
    expect(isCycle).toBe(false);
  });

  it('should detect 2-node cycle: A -> B, trying to add B -> A', () => {
    const edges = [
      { predecessorTaskId: 'task-A', dependentTaskId: 'task-B' },
    ];
    const isCycle = DependencyGraphUtil.wouldCreateCycle(edges, 'task-B', 'task-A');
    expect(isCycle).toBe(true);
  });

  it('should detect 3-node cycle: A -> B -> C, trying to add C -> A', () => {
    const edges = [
      { predecessorTaskId: 'task-A', dependentTaskId: 'task-B' },
      { predecessorTaskId: 'task-B', dependentTaskId: 'task-C' },
    ];
    const isCycle = DependencyGraphUtil.wouldCreateCycle(edges, 'task-C', 'task-A');
    expect(isCycle).toBe(true);
  });

  it('should detect multi-branch cycle: A -> B -> C, A -> D -> C, trying to add C -> A', () => {
    const edges = [
      { predecessorTaskId: 'task-A', dependentTaskId: 'task-B' },
      { predecessorTaskId: 'task-B', dependentTaskId: 'task-C' },
      { predecessorTaskId: 'task-A', dependentTaskId: 'task-D' },
      { predecessorTaskId: 'task-D', dependentTaskId: 'task-C' },
    ];
    const isCycle = DependencyGraphUtil.wouldCreateCycle(edges, 'task-C', 'task-A');
    expect(isCycle).toBe(true);
  });

  it('should allow diamond DAG: A -> B -> D and A -> C -> D without cycle', () => {
    const edges = [
      { predecessorTaskId: 'task-A', dependentTaskId: 'task-B' },
      { predecessorTaskId: 'task-A', dependentTaskId: 'task-C' },
      { predecessorTaskId: 'task-B', dependentTaskId: 'task-D' },
    ];
    // Adding C -> D is valid
    const isCycle = DependencyGraphUtil.wouldCreateCycle(edges, 'task-C', 'task-D');
    expect(isCycle).toBe(false);
  });

  it('should correctly evaluate if all predecessors are DONE', () => {
    expect(DependencyGraphUtil.areAllPredecessorsDone([])).toBe(true);
    expect(DependencyGraphUtil.areAllPredecessorsDone([{ status: 'DONE' }, { status: 'DONE' }])).toBe(true);
    expect(DependencyGraphUtil.areAllPredecessorsDone([{ status: 'DONE' }, { status: 'IN_PROGRESS' }])).toBe(false);
    expect(DependencyGraphUtil.areAllPredecessorsDone([{ status: 'BLOCKED' }])).toBe(false);
  });
});
