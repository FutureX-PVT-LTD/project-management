const assert = require('assert');

// 1. Test Due Date Formatting Logic
function formatDueQuiet(dueDateInput) {
  if (!dueDateInput) return null;
  const d = new Date(dueDateInput);
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: overdueDays === 1 ? 'Overdue 1d' : `Overdue ${overdueDays}d`,
      isOverdue: true,
      isDueSoon: false,
    };
  }
  if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false, isDueSoon: true };
  }
  if (diffDays === 1) {
    return { text: 'Due tomorrow', isOverdue: false, isDueSoon: true };
  }
  if (diffDays <= 3) {
    return { text: `Due in ${diffDays}d`, isOverdue: false, isDueSoon: true };
  }
  return {
    text: 'Future Date',
    isOverdue: false,
    isDueSoon: false,
  };
}

console.log('Testing formatDueQuiet...');
const now = new Date();

const pastDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
const resPast = formatDueQuiet(pastDate);
assert.strictEqual(resPast.isOverdue, true);
assert.strictEqual(resPast.text, 'Overdue 2d');

const todayDate = new Date();
const resToday = formatDueQuiet(todayDate);
assert.strictEqual(resToday.isDueSoon, true);
assert.strictEqual(resToday.text, 'Due today');

const tomorrowDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
const resTomorrow = formatDueQuiet(tomorrowDate);
assert.strictEqual(resTomorrow.isDueSoon, true);
assert.strictEqual(resTomorrow.text, 'Due tomorrow');

console.log('✅ formatDueQuiet passed!');

// 2. Test Sorting Logic
function sortColumnTasks(tasks) {
  const currentTime = new Date().getTime();
  const priorityRank = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
    NONE: 0,
  };

  return [...tasks].sort((a, b) => {
    const aIsDone = a.status === 'DONE' || a.status === 'CANCELED' || a.status === 'N_A';
    const bIsDone = b.status === 'DONE' || b.status === 'CANCELED' || b.status === 'N_A';

    if (!aIsDone && !bIsDone) {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      const aOverdue = aDue < currentTime;
      const bOverdue = bDue < currentTime;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (aOverdue && bOverdue) return aDue - bDue;
    }

    const aPri = priorityRank[a.priority || 'MEDIUM'] ?? 2;
    const bPri = priorityRank[b.priority || 'MEDIUM'] ?? 2;
    if (aPri !== bPri) return bPri - aPri;

    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;

    return (a.order || 0) - (b.order || 0);
  });
}

console.log('Testing sortColumnTasks...');
const testTasks = [
  { id: '1', title: 'Normal task', priority: 'LOW', dueDate: new Date(now.getTime() + 500000).toISOString() },
  { id: '2', title: 'Overdue task', priority: 'LOW', dueDate: new Date(now.getTime() - 500000).toISOString() },
  { id: '3', title: 'Urgent task', priority: 'URGENT', dueDate: new Date(now.getTime() + 500000).toISOString() },
];

const sorted = sortColumnTasks(testTasks);
// Overdue task should come first even if lower priority
assert.strictEqual(sorted[0].id, '2', 'Overdue task must be sorted first');
// Urgent task should come next
assert.strictEqual(sorted[1].id, '3', 'Urgent task must come before normal low priority');
assert.strictEqual(sorted[2].id, '1', 'Normal low priority task must come last');

console.log('✅ sortColumnTasks passed!');

// 3. Test 4-Column Categorization (NOT STARTED, IN PROGRESS, WAITING, DONE)
console.log('Testing 4-column categorization...');
const sampleTasks = [
  { id: 't1', status: 'READY' },
  { id: 't2', status: 'IN_PROGRESS' },
  { id: 't3', status: 'WAITING' },
  { id: 't4', status: 'BLOCKED' },
  { id: 't5', status: 'IN_REVIEW' },
  { id: 't6', status: 'DONE' },
];

const notStarted = sampleTasks.filter(t => t.status === 'READY');
const inProgress = sampleTasks.filter(t => t.status === 'IN_PROGRESS');
const waiting = sampleTasks.filter(t => t.status === 'WAITING' || t.status === 'BLOCKED' || t.status === 'IN_REVIEW');
const done = sampleTasks.filter(t => t.status === 'DONE');

assert.strictEqual(notStarted.length, 1, 'NOT STARTED must contain READY tasks');
assert.strictEqual(inProgress.length, 1, 'IN PROGRESS must contain IN_PROGRESS tasks');
assert.strictEqual(waiting.length, 3, 'WAITING must contain WAITING, BLOCKED, and IN_REVIEW tasks');
assert.strictEqual(done.length, 1, 'DONE must contain DONE tasks');

console.log('✅ 4-column categorization passed!');

console.log('All My Work Board unit tests passed successfully!');
