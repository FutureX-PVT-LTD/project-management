'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Send,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { TaskStatus, TaskPriority, UserRole, ReviewStatus } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate, cn } from '@/lib/utils';

interface TaskDetailSlideOverProps {
  taskId: string | null;
  open: boolean;
  onClose: () => void;
  onSelectTask?: (id: string) => void;
}

export function TaskDetailSlideOver({
  taskId,
  open,
  onClose,
  onSelectTask,
}: TaskDetailSlideOverProps) {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canManage = hasRole(UserRole.OWNER, UserRole.ADMIN);


  const [activeTab, setActiveTab] = useState<'overview' | 'subtasks' | 'updates' | 'activity'>('overview');

  // Daily update local state
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [completedToday, setCompletedToday] = useState('');
  const [blockerNote, setBlockerNote] = useState('');
  const [nextStepNote, setNextStepNote] = useState('');

  // Subtask local state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Fetch Task Details
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`),
    enabled: !!taskId && open,
  });

  const task = taskData as any;
  const blockedBy = asArray<any>(task?.blockedBy);
  const blocking = asArray<any>(task?.blocking);
  const subtasks = asArray<any>(task?.subtasks);
  const progressUpdates = asArray<any>(task?.dailyUpdates || task?.progressUpdates);
  const activityLogs = asArray<any>(task?.activities || task?.activityLogs);
  const currentProgress = Math.min(Math.max(Number(task?.progress || 0), 0), 99);

  // Initialize progress when task loads
  React.useEffect(() => {
    if (task?.id) {
      setUpdateProgress(currentProgress);
    }
  }, [task?.id, currentProgress]);

  // Update Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: TaskStatus) =>
      api.patch(`/tasks/${taskId}`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (status: ReviewStatus) =>
      api.post(`/tasks/${taskId}/review`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  // Submit Daily Progress Update Mutation
  const progressUpdateMutation = useMutation({
    mutationFn: () =>
      api.post(`/tasks/${taskId}/daily-updates`, {
        progress: Number(updateProgress),
        completedToday: completedToday.trim(),
        blocker: blockerNote.trim() || undefined,
        nextStep: nextStepNote.trim(),
      }),
    onSuccess: () => {
      setCompletedToday('');
      setBlockerNote('');
      setNextStepNote('');
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  // Create Subtask Mutation
  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) =>
      api.post('/tasks', {
        title,
        projectId: task?.projectId,
        milestoneId: task?.milestoneId || undefined,
        assigneeId: task?.assigneeId || undefined,
        priority: task?.priority || TaskPriority.MEDIUM,
        parentTaskId: taskId,
        status: task?.assigneeId ? TaskStatus.READY : TaskStatus.PLANNED,
      }),
    onSuccess: () => {
      setNewSubtaskTitle('');
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
    },
  });

  // Toggle Subtask Mutation
  const toggleSubtaskMutation = useMutation({
    mutationFn: ({ subtaskId, isCompleted }: { subtaskId: string; isCompleted: boolean }) =>
      api.patch(`/tasks/${subtaskId}`, {
        status: isCompleted ? TaskStatus.DONE : TaskStatus.READY,
        progress: isCompleted ? 100 : 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
    },
  });

  if (!open) return null;

  const canStartWork =
    task?.status === TaskStatus.TODO ||
    task?.status === TaskStatus.READY ||
    task?.status === TaskStatus.PLANNED;
  const canSubmitDailyUpdate = task?.status === TaskStatus.IN_PROGRESS;
  const mutationError =
    updateStatusMutation.error ||
    reviewMutation.error ||
    progressUpdateMutation.error ||
    createSubtaskMutation.error ||
    toggleSubtaskMutation.error;
  const mutationErrorMessage = mutationError instanceof Error ? mutationError.message : '';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-200"
      />


      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-[540px] bg-white border-l border-fx-border shadow-drawer flex flex-col justify-between animate-fadeIn">
          {/* Header */}
          <div className="px-5 py-4 border-b border-fx-border/70 flex items-start justify-between gap-3 bg-white">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-fx-text-muted bg-fx-bg px-1.5 py-0.5 rounded border border-fx-border">
                  {task?.humanId || '...'}
                </span>
                {task?.project && (
                  <span className="text-xs text-fx-text-secondary truncate font-medium">
                    {task.project.name}
                  </span>
                )}
              </div>
              <h2 className="text-base font-semibold text-fx-text-primary tracking-tight leading-snug">
                {task?.title || 'Loading task...'}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-fx-text-muted hover:text-fx-text-primary hover:bg-fx-bg fx-transition shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Bar (Status + Quick Actions) */}
          <div className="px-5 py-2.5 bg-fx-bg border-b border-fx-border flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-fx-text-muted text-[11px]">Status:</span>
              <StatusPill status={task?.status || TaskStatus.TODO} size="sm" />
            </div>

            {/* Role / State Actions */}
            <div className="flex items-center gap-1.5">
              {canStartWork && (
                <Button
                  size="xs"
                  variant="primary"
                  loading={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate(TaskStatus.IN_PROGRESS)}
                  leftIcon={<Play className="w-3 h-3 fill-white" />}
                >
                  Start Work
                </Button>
              )}

              {task?.status === TaskStatus.IN_PROGRESS && (
                <Button
                  size="xs"
                  variant="secondary"
                  loading={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate(TaskStatus.IN_REVIEW)}
                >
                  Submit for Review
                </Button>
              )}

              {canManage && task?.status === TaskStatus.IN_REVIEW && (
                <Button
                  size="xs"
                  variant="primary"
                  loading={reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate(ReviewStatus.APPROVED)}
                  leftIcon={<CheckCircle2 className="w-3 h-3" />}
                >
                  Approve Deliverable
                </Button>
              )}
            </div>
          </div>

          {mutationErrorMessage && (
            <div className="mx-5 mt-3 rounded-md border border-fx-danger/30 bg-fx-danger/10 px-3 py-2 text-xs font-medium text-fx-danger">
              {mutationErrorMessage}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="px-5 border-b border-fx-border flex items-center gap-4 text-xs font-medium bg-white">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'updates', label: 'Daily Updates' },
              { id: 'subtasks', label: `Subtasks (${subtasks.length})` },
              { id: 'activity', label: 'Activity' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'py-2.5 border-b-2 -mb-px fx-transition',
                  activeTab === tab.id
                    ? 'border-fx-green text-fx-green-dark font-semibold'
                    : 'border-transparent text-fx-text-secondary hover:text-fx-text-primary',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-fx-text-primary">
            {isLoading ? (
              <div className="p-8 text-center text-fx-text-muted">Loading details...</div>
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Aligned Property Table */}
                    <div className="bg-white border border-fx-border rounded-lg divide-y divide-fx-border/60">
                      <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-fx-text-muted text-[11px] font-medium">Assignee</span>
                        <span className="font-semibold text-fx-text-primary">
                          {task?.assignee
                            ? `${task.assignee.firstName} ${task.assignee.lastName}`
                            : 'Unassigned'}
                        </span>
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-fx-text-muted text-[11px] font-medium">Priority</span>
                        <PriorityBadge priority={task?.priority || TaskPriority.MEDIUM} />
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-fx-text-muted text-[11px] font-medium">Progress</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{task?.progress || 0}%</span>
                        </div>
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-fx-text-muted text-[11px] font-medium">Due Date</span>
                        <span className="font-mono text-fx-text-secondary">
                          {task?.dueDate ? formatDate(task.dueDate) : 'No deadline'}
                        </span>
                      </div>
                      {task?.milestone && (
                        <div className="px-3.5 py-2.5 flex items-center justify-between">
                          <span className="text-fx-text-muted text-[11px] font-medium">Milestone</span>
                          <span className="font-medium text-fx-text-primary">{task.milestone.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Dependency Chain Visualization */}
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fx-text-muted">
                        Finish-to-Start Dependencies
                      </h4>

                      {/* Waiting on Predecessors */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-fx-text-secondary font-medium">
                          Waiting On (Predecessors):
                        </p>
                        {blockedBy.length === 0 ? (
                          <p className="text-[11px] text-fx-text-muted italic bg-fx-bg p-2 rounded border border-fx-border/60">
                            No incoming prerequisite tasks.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {blockedBy.map((dep: any) => {
                              const pred = dep.predecessorTask;
                              const isDone = pred?.status === TaskStatus.DONE;
                              return (
                                <div
                                  key={dep.id}
                                  onClick={() => onSelectTask && pred && onSelectTask(pred.id)}
                                  className={cn(
                                    'p-2.5 rounded-md border flex items-center justify-between gap-2 cursor-pointer fx-transition text-xs',
                                    isDone
                                      ? 'bg-fx-green-soft/40 border-fx-green/20'
                                      : 'bg-amber-50/50 border-amber-200/70 hover:bg-amber-50',
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-semibold text-[11px] shrink-0">
                                      {pred?.humanId}
                                    </span>
                                    <span className="truncate font-medium">{pred?.title}</span>
                                  </div>
                                  <StatusPill status={pred?.status || TaskStatus.TODO} size="xs" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Unlocks Dependents */}
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] text-fx-text-secondary font-medium">
                          Unlocks (Successors):
                        </p>
                        {blocking.length === 0 ? (
                          <p className="text-[11px] text-fx-text-muted italic bg-fx-bg p-2 rounded border border-fx-border/60">
                            No dependent tasks waiting on this deliverable.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {blocking.map((dep: any) => {
                              const succ = dep.dependentTask;
                              return (
                                <div
                                  key={dep.id}
                                  onClick={() => onSelectTask && succ && onSelectTask(succ.id)}
                                  className="p-2.5 rounded-md bg-fx-bg border border-fx-border hover:bg-fx-bg-hover flex items-center justify-between gap-2 cursor-pointer fx-transition text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-semibold text-fx-text-muted text-[11px] shrink-0">
                                      {succ?.humanId}
                                    </span>
                                    <span className="truncate font-medium">{succ?.title}</span>
                                  </div>
                                  <StatusPill status={succ?.status || TaskStatus.TODO} size="xs" />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fx-text-muted">
                        Description & Specification
                      </h4>
                      <div className="bg-fx-bg border border-fx-border rounded-lg p-3.5 text-xs text-fx-text-primary leading-relaxed whitespace-pre-wrap">
                        {task?.description || 'No description provided for this deliverable.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DAILY UPDATES */}
                {activeTab === 'updates' && (
                  <div className="space-y-6">
                    {/* Submission Form */}
                    {!canSubmitDailyUpdate ? (
                      <div className="bg-white border border-fx-border rounded-lg p-4 space-y-3 text-xs">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <StatusPill status={task?.status || TaskStatus.TODO} size="xs" />
                              <span className="font-semibold text-fx-text-primary">
                                Start work to submit daily updates.
                              </span>
                            </div>
                            <p className="text-fx-text-secondary">
                              {canStartWork
                                ? 'This task is assigned but not active yet. Start work first, then the daily update form will appear here.'
                                : task?.status === TaskStatus.WAITING
                                  ? 'This task is waiting for prerequisite work before updates can be submitted.'
                                  : task?.status === TaskStatus.IN_REVIEW
                                    ? 'This task is already submitted for Admin review.'
                                    : 'Daily updates are only available while a task is in progress.'}
                            </p>
                          </div>
                          {canStartWork && (
                            <Button
                              size="xs"
                              variant="primary"
                              loading={updateStatusMutation.isPending}
                              onClick={() => updateStatusMutation.mutate(TaskStatus.IN_PROGRESS)}
                              leftIcon={<Play className="w-3 h-3 fill-white" />}
                            >
                              Start Work
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                    <div className="bg-white border border-fx-border rounded-lg p-4 space-y-3.5">
                      <h4 className="text-xs font-semibold text-fx-text-primary">
                        Submit Daily Progress Update
                      </h4>

                      {/* Progress Slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-fx-text-secondary font-medium">Completion:</span>
                          <span className="font-mono font-bold text-fx-green">{updateProgress}%</span>
                        </div>
                        <input
                          type="range"
                          min={currentProgress}
                          max="99"
                          step="5"
                          value={updateProgress}
                          onChange={(e) =>
                            setUpdateProgress(Math.min(Math.max(Number(e.target.value), currentProgress), 99))
                          }
                          className="w-full accent-fx-green cursor-pointer"
                        />
                      </div>

                      {/* Completed Today */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-fx-text-secondary">
                          What did you complete today?
                        </label>
                        <textarea
                          rows={2}
                          placeholder="e.g. Configured vehicle physics handling curve..."
                          value={completedToday}
                          onChange={(e) => setCompletedToday(e.target.value)}
                          className="w-full rounded-md border border-fx-border bg-fx-bg p-2 text-xs focus:border-fx-green focus:outline-none"
                        />
                      </div>

                      {/* Next Steps */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-fx-text-secondary">
                          Next Steps:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Test wheel slip calculations on steep surfaces..."
                          value={nextStepNote}
                          onChange={(e) => setNextStepNote(e.target.value)}
                          className="w-full rounded-md border border-fx-border bg-fx-bg px-2.5 py-1.5 text-xs focus:border-fx-green focus:outline-none"
                        />
                      </div>

                      {/* Optional Blocker */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-fx-text-secondary flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-fx-text-muted" />
                          <span>Any blockers? (Optional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Leave blank if unblocked..."
                          value={blockerNote}
                          onChange={(e) => setBlockerNote(e.target.value)}
                          className="w-full rounded-md border border-fx-border bg-fx-bg px-2.5 py-1.5 text-xs focus:border-fx-green focus:outline-none"
                        />
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        loading={progressUpdateMutation.isPending}
                        disabled={!completedToday.trim() || !nextStepNote.trim() || updateProgress < currentProgress || updateProgress > 99}
                        onClick={() => progressUpdateMutation.mutate()}
                        leftIcon={<Send className="w-3 h-3" />}
                      >
                        Submit Update
                      </Button>
                    </div>
                    )}

                    {/* Historical Updates List */}
                    <div className="space-y-2">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fx-text-muted">
                        Progress History
                      </h4>
                      {progressUpdates.length === 0 ? (
                        <p className="text-xs text-fx-text-muted italic bg-fx-bg p-3 rounded-lg border border-fx-border/60">
                          No updates recorded yet.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {progressUpdates.map((upd: any) => (
                            <div
                              key={upd.id}
                              className="bg-white border border-fx-border rounded-lg p-3 space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-fx-text-primary">
                                  {upd.user?.firstName} {upd.user?.lastName}
                                </span>
                                <span className="font-mono text-fx-green font-bold">
                                  {upd.progressAfter ?? upd.progress}%
                                </span>
                              </div>
                              {upd.completedToday && (
                                <p className="text-xs text-fx-text-primary">{upd.completedToday}</p>
                              )}
                              {upd.nextStep && (
                                <p className="text-[11px] text-fx-text-secondary">
                                  Next: {upd.nextStep}
                                </p>
                              )}
                              {upd.blocker && (
                                <p className="text-[11px] text-fx-semantic-danger font-medium">
                                  Blocker: {upd.blocker}
                                </p>
                              )}
                              <p className="text-[10px] text-fx-text-muted pt-1">
                                {formatDate(upd.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: SUBTASKS */}
                {activeTab === 'subtasks' && (
                  <div className="space-y-4">
                    {/* Add Subtask */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add subtask deliverable..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        className="h-8 text-xs bg-fx-bg"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                            createSubtaskMutation.mutate(newSubtaskTitle.trim());
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!newSubtaskTitle.trim()}
                        loading={createSubtaskMutation.isPending}
                        onClick={() => createSubtaskMutation.mutate(newSubtaskTitle.trim())}
                      >
                        Add
                      </Button>
                    </div>

                    {/* Subtasks List */}
                    {subtasks.length === 0 ? (
                      <p className="text-xs text-fx-text-muted italic bg-fx-bg p-4 rounded-lg border border-fx-border/60 text-center">
                        No subtasks added.
                      </p>
                    ) : (
                      <div className="bg-white border border-fx-border rounded-lg divide-y divide-fx-border/60 overflow-hidden">
                        {subtasks.map((st: any) => {
                          const isCompleted = st.status === TaskStatus.DONE || st.isCompleted;
                          return (
                          <div
                            key={st.id}
                            onClick={() =>
                              toggleSubtaskMutation.mutate({
                                subtaskId: st.id,
                                isCompleted: !isCompleted,
                              })
                            }
                            className="p-3 hover:bg-fx-bg-hover flex items-center gap-2.5 cursor-pointer fx-transition"
                          >
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-fx-green accent-fx-green cursor-pointer"
                            />
                            <span
                              className={cn(
                                'text-xs flex-1 truncate',
                                isCompleted && 'line-through text-fx-text-muted',
                              )}
                            >
                              {st.title}
                            </span>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: ACTIVITY LOG */}
                {activeTab === 'activity' && (
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fx-text-muted">
                      Audit & Activity History
                    </h4>
                    {activityLogs.length === 0 ? (
                      <p className="text-xs text-fx-text-muted italic bg-fx-bg p-4 rounded-lg border border-fx-border/60 text-center">
                        No activity recorded yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-fx-border/60 bg-white border border-fx-border rounded-lg">
                        {activityLogs.map((act: any) => (
                          <div key={act.id} className="p-3 space-y-0.5 text-xs">
                            <p className="text-fx-text-primary">{act.description || act.action || act.actionType}</p>
                            <p className="text-[10px] text-fx-text-muted">{formatDate(act.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
