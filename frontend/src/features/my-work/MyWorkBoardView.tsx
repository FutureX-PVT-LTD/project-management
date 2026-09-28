'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { TaskStatus, TaskPriority } from '@futurex/shared';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Button } from '@/components/ui/Button';
import { formatDate, formatTaskId, formatTimeAgo, cn } from '@/lib/utils';
import { canStartTask } from '@/lib/permissions';
import { compareTasksByWorkflowOrder } from '@/lib/task-order';

interface MyWorkBoardViewProps {
  tasks: any[];
  user: any;
  onSelectTask: (taskId: string) => void;
  onStartWork: (task: any) => void;
  isStartingTaskId: string | null;
  onActionNotice: (notice: { type: 'success' | 'error' | 'info'; text: string }) => void;
}

export function formatDueQuiet(
  dueDateInput?: string | number | Date | null,
): { text: string; isOverdue: boolean; isDueSoon: boolean } | null {
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
    text: formatDate(d),
    isOverdue: false,
    isDueSoon: false,
  };
}

export function sortColumnTasks(tasks: any[]): any[] {
  const now = new Date().getTime();
  const priorityRank: Record<string, number> = {
    URGENT: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
    NONE: 0,
  };

  return [...tasks].sort((a, b) => {
    // 1. Overdue first (if active)
    const aIsDone =
      a.status === TaskStatus.DONE ||
      a.status === TaskStatus.CANCELED ||
      a.status === TaskStatus.N_A;
    const bIsDone =
      b.status === TaskStatus.DONE ||
      b.status === TaskStatus.CANCELED ||
      b.status === TaskStatus.N_A;

    if (!aIsDone && !bIsDone) {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      const aOverdue = aDue < now;
      const bOverdue = bDue < now;

      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (aOverdue && bOverdue) return aDue - bDue;
    }

    // 2. Priority
    const aPri = priorityRank[a.priority || 'MEDIUM'] ?? 2;
    const bPri = priorityRank[b.priority || 'MEDIUM'] ?? 2;
    if (aPri !== bPri) return bPri - aPri;

    // 3. Due soonest
    const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
    const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
    if (aDue !== bDue) return aDue - bDue;

    // 4. Workflow order
    return compareTasksByWorkflowOrder(a, b);
  });
}

interface KanbanCardProps {
  task: any;
  user: any;
  onSelectTask: (taskId: string) => void;
  onStartWork: (task: any) => void;
  isStarting: boolean;
  onDragStart: (e: React.DragEvent, task: any) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isDragging: boolean;
}

function KanbanCard({
  task,
  user,
  onSelectTask,
  onStartWork,
  isStarting,
  onDragStart,
  onDragEnd,
  isDragging,
}: KanbanCardProps) {
  const isMarketing = task.workstream === 'MARKETING';
  const cleanId = formatTaskId(task.humanId, task.project?.key, task.project?.name);
  const dueInfo = formatDueQuiet(task.dueDate);

  // Unfinished dependencies for WAITING tasks
  const unfinishedDeps = (task.blockedBy || []).filter(
    (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
  );

  const phaseName = task.checklistPhase || task.milestone?.name;

  // Single dominant action per card
  const renderAction = () => {
    switch (task.status) {
      case TaskStatus.READY:
      case TaskStatus.TODO:
        if (canStartTask(user, task)) {
          return (
            <Button
              size="xs"
              variant="primary"
              loading={isStarting}
              onClick={(e) => {
                e.stopPropagation();
                onStartWork(task);
              }}
              leftIcon={<Play className="w-3 h-3 fill-white" />}
            >
              {isMarketing ? 'Start Checklist →' : 'Start Work →'}
            </Button>
          );
        }
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTask(task.id);
            }}
          >
            View Details →
          </Button>
        );

      case TaskStatus.IN_PROGRESS:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTask(task.id);
            }}
          >
            {isMarketing ? 'Update Status →' : 'Update Progress →'}
          </Button>
        );

      case TaskStatus.WAITING:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTask(task.id);
            }}
          >
            View Dependency →
          </Button>
        );

      case TaskStatus.BLOCKED:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTask(task.id);
            }}
          >
            View Blocker →
          </Button>
        );

      case TaskStatus.IN_REVIEW:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTask(task.id);
            }}
          >
            View Submission →
          </Button>
        );

      case TaskStatus.DONE:
      default:
        return (
          <Button
            size="xs"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTask(task.id);
            }}
          >
            Open →
          </Button>
        );
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={true}
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onSelectTask(task.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectTask(task.id);
        }
      }}
      className={cn(
        'group bg-white border border-[#E3E7EC] rounded-[10px] p-3 text-xs transition-all cursor-pointer select-none space-y-2.5',
        'hover:border-[#C4CDD7] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40',
        isDragging && 'opacity-40 border-dashed border-[#2563EB]',
        task.status === TaskStatus.DONE && 'bg-[#FCFDFD] opacity-90',
      )}
      aria-label={`${cleanId}: ${task.title}`}
    >
      {/* 1. Header: Task ID, Workstream, Priority & Subtle Status Tag */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono font-medium text-[11px] text-[#626A73] bg-[#F7F8FA] px-1.5 py-0.5 rounded-[4px] border border-[#E3E7EC] shrink-0">
            {cleanId}
          </span>
          <span className="text-[11px] font-medium text-[#626A73] truncate">
            {isMarketing ? 'Marketing' : 'Development'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Subtle Semantic Status Tag inside shared WAITING / BLOCKED column */}
          {task.status === TaskStatus.BLOCKED && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#C24141] bg-[#FFF2F2] border border-[#FCD2D2] px-1.5 py-0.5 rounded-[4px]">
              Blocked
            </span>
          )}
          {task.status === TaskStatus.WAITING && (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#A86B12] bg-[#FEF8EE] border border-[#F5E1B9] px-1.5 py-0.5 rounded-[4px]">
              Waiting
            </span>
          )}
          {task.priority &&
            task.priority !== TaskPriority.MEDIUM &&
            task.priority !== TaskPriority.LOW && (
              <PriorityBadge priority={task.priority} compact={true} />
            )}
        </div>
      </div>

      {/* 2. Middle: Task Title */}
      <div>
        <h4 className="font-semibold text-[13px] text-[#181B20] group-hover:text-[#2563EB] leading-snug line-clamp-2 transition-colors">
          {task.title}
        </h4>

        {/* Multi-Project & Phase Context */}
        <div className="mt-1 text-[11.5px] text-[#626A73] flex flex-wrap items-center gap-x-1.5">
          <span className="font-medium text-[#323842] truncate max-w-[140px]">
            {task.project?.name || 'Project'}
          </span>
          {phaseName && (
            <>
              <span className="text-[#B0B7C1]">·</span>
              <span className="text-[#626A73] truncate max-w-[120px]">{phaseName}</span>
            </>
          )}
        </div>
      </div>

      {/* 3. Status-Specific Context: In Progress, Waiting Prereqs, Blocker Reason, or Review submission */}
      {task.status === TaskStatus.IN_PROGRESS && (
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-[11px] text-[#626A73]">
            <span>Progress</span>
            <span className="font-mono font-medium text-[#181B20]">
              {task.progress || 0}%
            </span>
          </div>
          <div className="w-full bg-[#E5E7EB] rounded-full h-1 overflow-hidden">
            <div
              className="bg-[#2563EB] h-1 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, task.progress || 0))}%` }}
            />
          </div>
        </div>
      )}

      {task.status === TaskStatus.WAITING && (
        <div className="text-[11px] text-[#A86B12] bg-[#FEF8EE] border border-[#F5E1B9] px-2 py-1 rounded-[6px] truncate flex items-center gap-1.5">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {unfinishedDeps.length === 1
              ? `Waiting for ${formatTaskId(
                  unfinishedDeps[0].predecessorTask?.humanId,
                  unfinishedDeps[0].predecessorTask?.project?.key,
                )}`
              : unfinishedDeps.length > 1
                ? `${unfinishedDeps.length} prerequisites remaining`
                : 'Waiting on prerequisites'}
          </span>
        </div>
      )}

      {task.status === TaskStatus.BLOCKED && (
        <div className="text-[11px] text-[#C24141] bg-[#FFF2F2] border border-[#FCD2D2] px-2 py-1 rounded-[6px] line-clamp-2 flex items-start gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="leading-tight">
            {task.blockerReason || 'Blocked by unresolved impediment'}
          </span>
        </div>
      )}

      {task.status === TaskStatus.IN_REVIEW && (
        <div className="text-[11px] text-[#7557B5] bg-[#F5F2FC] border border-[#DDD6FE] px-2 py-1 rounded-[6px] truncate flex items-center gap-1.5">
          <Clock className="w-3 h-3 shrink-0" />
          <span className="truncate">
            Submitted {formatTimeAgo(task.updatedAt) || 'recently'}
          </span>
        </div>
      )}

      {/* 4. Footer: Due date + Primary Quick Action */}
      <div className="pt-2 border-t border-[#F0F2F5] flex items-center justify-between gap-2">
        <div className="text-[11px] font-mono shrink-0">
          {dueInfo ? (
            <span
              className={cn(
                'flex items-center gap-1',
                dueInfo.isOverdue
                  ? 'text-[#C24141] font-medium'
                  : dueInfo.isDueSoon
                    ? 'text-[#A86B12] font-medium'
                    : 'text-[#626A73]',
              )}
            >
              <Calendar className="w-3 h-3" />
              {dueInfo.text}
            </span>
          ) : (
            <span className="text-[#929AA3]">No due date</span>
          )}
        </div>

        <div className="shrink-0">{renderAction()}</div>
      </div>
    </div>
  );
}

export function MyWorkBoardView({
  tasks,
  user,
  onSelectTask,
  onStartWork,
  isStartingTaskId,
  onActionNotice,
}: MyWorkBoardViewProps) {
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);
  const [doneCollapsed, setDoneCollapsed] = useState(false);

  // Categorize tasks into 5 canonical Kanban columns
  const readyTasks = useMemo(() => {
    return sortColumnTasks(
      tasks.filter(
        (t) =>
          t.status === TaskStatus.READY ||
          (t.status === TaskStatus.TODO && (!t.blockedBy || t.blockedBy.length === 0)),
      ),
    );
  }, [tasks]);

  const inProgressTasks = useMemo(() => {
    return sortColumnTasks(tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS));
  }, [tasks]);

  const waitingBlockedTasks = useMemo(() => {
    return sortColumnTasks(
      tasks.filter((t) => t.status === TaskStatus.WAITING || t.status === TaskStatus.BLOCKED),
    );
  }, [tasks]);

  const inReviewTasks = useMemo(() => {
    return sortColumnTasks(tasks.filter((t) => t.status === TaskStatus.IN_REVIEW));
  }, [tasks]);

  const doneTasks = useMemo(() => {
    return sortColumnTasks(
      tasks.filter(
        (t) =>
          t.status === TaskStatus.DONE ||
          t.status === TaskStatus.CANCELED ||
          t.status === TaskStatus.N_A,
      ),
    );
  }, [tasks]);

  // Drag and Drop event handlers with strict workflow guards
  const handleDragStart = (e: React.DragEvent, task: any) => {
    setDraggingTaskId(task.id);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        taskId: task.id,
        status: task.status,
        projectId: task.projectId || task.project?.id,
        workstream: task.workstream,
        title: task.title,
      }),
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (colId: string) => {
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingTaskId(null);

    const json = e.dataTransfer.getData('application/json');
    if (!json) return;

    let dragData: any;
    try {
      dragData = JSON.parse(json);
    } catch {
      return;
    }

    const { taskId, status: sourceStatus } = dragData;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Workflow Rule 1: Dropping to READY
    if (targetColId === 'READY') {
      if (sourceStatus === TaskStatus.READY) return;
      onActionNotice({
        type: 'error',
        text: 'Deliverables currently active, in review, or completed cannot be reverted to Ready.',
      });
      return;
    }

    // Workflow Rule 2: Dropping to IN_PROGRESS
    if (targetColId === 'IN_PROGRESS') {
      if (sourceStatus === TaskStatus.IN_PROGRESS) return;

      if (sourceStatus === TaskStatus.READY || sourceStatus === TaskStatus.TODO) {
        if (!canStartTask(user, task)) {
          onActionNotice({
            type: 'error',
            text: 'Cannot start work: unresolved prerequisites remain.',
          });
          return;
        }
        onStartWork(task);
        return;
      }

      if (sourceStatus === TaskStatus.WAITING || sourceStatus === TaskStatus.BLOCKED) {
        onActionNotice({
          type: 'error',
          text: 'Unresolved prerequisites or blockers prevent starting this deliverable.',
        });
        return;
      }

      if (sourceStatus === TaskStatus.IN_REVIEW) {
        onActionNotice({
          type: 'error',
          text: 'This deliverable is currently undergoing review and cannot be restarted.',
        });
        return;
      }

      if (sourceStatus === TaskStatus.DONE) {
        onActionNotice({
          type: 'error',
          text: 'Completed deliverables cannot be restarted directly from the board.',
        });
        return;
      }
    }

    // Workflow Rule 3: Dropping to WAITING_BLOCKED
    if (targetColId === 'WAITING_BLOCKED') {
      if (sourceStatus === TaskStatus.WAITING || sourceStatus === TaskStatus.BLOCKED) return;
      onSelectTask(task.id);
      onActionNotice({
        type: 'info',
        text: 'To log an impediment or update dependencies, open the deliverable details.',
      });
      return;
    }

    // Workflow Rule 4: Dropping to IN_REVIEW
    if (targetColId === 'IN_REVIEW') {
      if (sourceStatus === TaskStatus.IN_REVIEW) return;

      if (sourceStatus === TaskStatus.IN_PROGRESS) {
        // Submit for Review requires notes/evidence slideover flow
        onSelectTask(task.id);
        onActionNotice({
          type: 'info',
          text: 'Opening deliverable to submit completion notes and evidence for review.',
        });
        return;
      }

      onActionNotice({
        type: 'error',
        text: 'Deliverable must be in progress before submitting for review.',
      });
      return;
    }

    // Workflow Rule 5: Dropping to DONE
    if (targetColId === 'DONE') {
      if (sourceStatus === TaskStatus.DONE) return;

      if (sourceStatus === TaskStatus.IN_REVIEW) {
        onActionNotice({
          type: 'error',
          text: 'Team Members cannot approve their own reviews. An Admin or Manager must complete review.',
        });
        return;
      }

      if (sourceStatus === TaskStatus.IN_PROGRESS) {
        onSelectTask(task.id);
        onActionNotice({
          type: 'info',
          text: 'Please submit your deliverable for review or complete all required checklist items.',
        });
        return;
      }

      onActionNotice({
        type: 'error',
        text: 'Deliverables must be executed and reviewed before being completed.',
      });
      return;
    }
  };

  const columns = [
    {
      id: 'READY',
      title: 'READY',
      count: readyTasks.length,
      dotColor: 'bg-[#237A57]',
      tasks: readyTasks,
      emptyText: 'No ready deliverables',
    },
    {
      id: 'IN_PROGRESS',
      title: 'IN PROGRESS',
      count: inProgressTasks.length,
      dotColor: 'bg-[#2563EB]',
      tasks: inProgressTasks,
      emptyText: 'No active work',
    },
    {
      id: 'WAITING_BLOCKED',
      title: 'WAITING / BLOCKED',
      count: waitingBlockedTasks.length,
      dotColor: 'bg-[#A86B12]',
      tasks: waitingBlockedTasks,
      emptyText: 'No waiting or blocked tasks',
    },
    {
      id: 'IN_REVIEW',
      title: 'IN REVIEW',
      count: inReviewTasks.length,
      dotColor: 'bg-[#7557B5]',
      tasks: inReviewTasks,
      emptyText: 'No work under review',
    },
    {
      id: 'DONE',
      title: 'DONE',
      count: doneTasks.length,
      dotColor: 'bg-[#929AA3]',
      tasks: doneTasks,
      emptyText: 'No completed deliverables',
      isDoneColumn: true,
    },
  ];

  return (
    <div className="w-full">
      {/* Desktop & Tablet: Horizontal Kanban Board */}
      <div className="hidden md:flex gap-3.5 overflow-x-auto pb-6 items-start no-scrollbar">
        {columns.map((col) => {
          const isOver = dragOverColumn === col.id;
          const isDone = col.isDoneColumn;
          const visibleDoneTasks = showAllDone ? col.tasks : col.tasks.slice(0, 5);
          const hasHiddenDone = isDone && col.tasks.length > 5 && !showAllDone;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => handleDragLeave(col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                'w-[295px] min-w-[285px] max-w-[320px] shrink-0 bg-[#F7F8FA] border border-[#E3E7EC] rounded-[10px] p-3 transition-colors flex flex-col',
                isOver && 'border-[#2563EB]/40 bg-[#EEF4FF]/50 ring-2 ring-[#2563EB]/15',
                isDone && doneCollapsed && 'w-[80px] min-w-[80px] max-w-[80px] p-2.5',
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E3E7EC]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', col.dotColor)} />
                  {!(isDone && doneCollapsed) && (
                    <h3 className="text-xs font-semibold text-[#181B20] tracking-wide truncate">
                      {col.title}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-mono text-[#626A73] bg-white border border-[#E3E7EC] px-1.5 py-0.5 rounded-[4px]">
                    {col.count}
                  </span>

                  {isDone && (
                    <button
                      type="button"
                      onClick={() => setDoneCollapsed(!doneCollapsed)}
                      className="text-[#626A73] hover:text-[#181B20] p-0.5 rounded transition-colors"
                      title={doneCollapsed ? 'Expand Done column' : 'Collapse Done column'}
                      aria-label={doneCollapsed ? 'Expand Done column' : 'Collapse Done column'}
                    >
                      {doneCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Tasks List */}
              {!(isDone && doneCollapsed) && (
                <div className="max-h-[calc(100vh-270px)] overflow-y-auto pr-1 space-y-2.5 min-h-[120px]">
                  {col.tasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#929AA3]">
                      {col.emptyText}
                    </div>
                  ) : (
                    <>
                      {(isDone ? visibleDoneTasks : col.tasks).map((task) => (
                        <KanbanCard
                          key={task.id}
                          task={task}
                          user={user}
                          onSelectTask={onSelectTask}
                          onStartWork={onStartWork}
                          isStarting={isStartingTaskId === task.id}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggingTaskId === task.id}
                        />
                      ))}

                      {/* Quiet Expand / Collapse for Completed items */}
                      {hasHiddenDone && (
                        <div className="pt-1 text-center">
                          <button
                            type="button"
                            onClick={() => setShowAllDone(true)}
                            className="text-[11.5px] font-medium text-[#2563EB] hover:text-[#1D4ED8] hover:underline"
                          >
                            View all {col.tasks.length} completed work
                          </button>
                        </div>
                      )}
                      {isDone && showAllDone && col.tasks.length > 5 && (
                        <div className="pt-1 text-center">
                          <button
                            type="button"
                            onClick={() => setShowAllDone(false)}
                            className="text-[11.5px] font-medium text-[#626A73] hover:text-[#181B20] hover:underline"
                          >
                            Show recent only
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile (< 768px): Responsive Status Sections */}
      <div className="md:hidden space-y-4">
        {columns.map((col) => {
          return (
            <div
              key={col.id}
              className="bg-[#F7F8FA] border border-[#E3E7EC] rounded-[10px] p-3 space-y-2.5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', col.dotColor)} />
                  <h3 className="text-xs font-semibold text-[#181B20]">{col.title}</h3>
                </div>
                <span className="text-[11px] font-mono text-[#626A73] bg-white border border-[#E3E7EC] px-1.5 py-0.5 rounded-[4px]">
                  {col.count}
                </span>
              </div>

              {col.tasks.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#929AA3]">
                  {col.emptyText}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {col.tasks.map((task) => (
                    <KanbanCard
                      key={task.id}
                      task={task}
                      user={user}
                      onSelectTask={onSelectTask}
                      onStartWork={onStartWork}
                      isStarting={isStartingTaskId === task.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDragging={draggingTaskId === task.id}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
