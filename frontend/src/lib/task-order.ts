type OrderedTask = {
  id?: string;
  projectId?: string;
  project?: { id?: string; key?: string; name?: string } | null;
  workstream?: string | null;
  checklistOrder?: number | null;
  checklistCode?: string | null;
  taskNumber?: number | null;
  createdAt?: string | Date | null;
};

function checklistSequence(task: OrderedTask) {
  const storedOrder = Number(task.checklistOrder);
  if (Number.isFinite(storedOrder) && storedOrder > 0) return storedOrder;

  const codeOrder = Number(String(task.checklistCode || '').match(/(\d+)$/)?.[1]);
  if (Number.isFinite(codeOrder) && codeOrder > 0) return codeOrder;

  return Number.MAX_SAFE_INTEGER;
}

export function compareTasksByWorkflowOrder(a: OrderedTask, b: OrderedTask) {
  const aProject = String(a.project?.name || a.project?.key || a.projectId || '');
  const bProject = String(b.project?.name || b.project?.key || b.projectId || '');
  const projectComparison = aProject.localeCompare(bProject, undefined, { sensitivity: 'base' });
  if (projectComparison !== 0) return projectComparison;

  const workstreamRank: Record<string, number> = { DEVELOPMENT: 0, MARKETING: 1 };
  const aWorkstream = workstreamRank[a.workstream || ''] ?? 2;
  const bWorkstream = workstreamRank[b.workstream || ''] ?? 2;
  if (aWorkstream !== bWorkstream) return aWorkstream - bWorkstream;

  const sequenceDifference = checklistSequence(a) - checklistSequence(b);
  if (sequenceDifference !== 0) return sequenceDifference;

  const taskNumberDifference = Number(a.taskNumber || 0) - Number(b.taskNumber || 0);
  if (taskNumberDifference !== 0) return taskNumberDifference;

  const createdDifference = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  if (createdDifference !== 0) return createdDifference;

  return String(a.id || '').localeCompare(String(b.id || ''));
}
