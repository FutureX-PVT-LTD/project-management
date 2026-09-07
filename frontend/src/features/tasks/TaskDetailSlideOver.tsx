'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Send,
  Lock,
  RotateCcw,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray } from '@/lib/api-data';
import { TaskStatus, TaskPriority, UserRole, ReviewStatus } from '@futurex/shared';
import { useAuth } from '@/features/auth/AuthContext';
import {
  canStartTask,
  canSubmitForReview,
  canReviewTask,
  canUpdateTaskProgress,
  isTaskAssignee,
} from '@/lib/permissions';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate, cn } from '@/lib/utils';
import { TaskDetailSkeleton } from '@/components/ui/Skeleton';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'overview' | 'subtasks' | 'updates' | 'activity'>('overview');

  // Daily update local state
  const [updateProgress, setUpdateProgress] = useState<number>(0);
  const [completedToday, setCompletedToday] = useState('');
  const [blockerNote, setBlockerNote] = useState('');
  const [nextStepNote, setNextStepNote] = useState('');

  // Review reject state
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState('');

  // Subtask local state
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // Fetch Task Details
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => api.get(`/tasks/${taskId}`),
    enabled: !!taskId && open,
    staleTime: 15000,
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
      setShowRejectForm(false);
      setRejectFeedback('');
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
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ status, feedback }: { status: ReviewStatus; feedback?: string }) =>
      api.post(`/tasks/${taskId}/review`, { status, feedback }),
    onSuccess: () => {
      setShowRejectForm(false);
      setRejectFeedback('');
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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

  const canStart = canStartTask(user, task);
  const canSubmitReview = canSubmitForReview(user, task);
  const canReview = canReviewTask(user, task);
  const canUpdateProgress = canUpdateTaskProgress(user, task);
  const isAssignee = isTaskAssignee(user, task);
  const isAdminOrOwner = user?.globalRole === UserRole.ADMIN || user?.globalRole === UserRole.OWNER;
  const unfinishedDeps = blockedBy.filter((b: any) => b.predecessorTask?.status !== TaskStatus.DONE);
  const latestUpdate = progressUpdates[0];

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
        <div className="w-screen max-w-[540px] bg-white border-l border-fx-border shadow-drawer flex flex-col justify-between animate-drawerIn">
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
              {task?.status === TaskStatus.IN_REVIEW && canReview && (
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold text-[10px] border border-purple-200 uppercase tracking-wider">
                  Review Required
                </span>
              )}
            </div>

            {/* Role / State Actions */}
            <div className="flex items-center gap-1.5">
              {canStart && (
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

              {canSubmitReview && (
                <Button
                  size="xs"
                  variant="primary"
                  loading={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate(TaskStatus.IN_REVIEW)}
                  leftIcon={<Send className="w-3 h-3" />}
                >
                  Submit for Review
                </Button>
              )}

              {canReview && (
                <>
                  <Button
                    size="xs"
                    variant="primary"
                    loading={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate({ status: ReviewStatus.APPROVED })}
                    leftIcon={<CheckCircle2 className="w-3 h-3" />}
                  >
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => setShowRejectForm((prev) => !prev)}
                    leftIcon={<RotateCcw className="w-3 h-3" />}
                  >
                    Return for Changes
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Inline Review Feedback Form for Return for Changes */}
          {showRejectForm && canReview && (
            <div className="mx-5 mt-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-900">Return Work for Changes</span>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-fx-text-muted hover:text-fx-text-primary p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Provide feedback explaining why changes are requested so the assigned team member can revise their deliverable.
              </p>
              <textarea
                rows={2}
                placeholder="e.g. Please recheck physics calculations and verify brake torque on slopes..."
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                className="w-full rounded border border-amber-300 bg-white p-2 text-xs focus:border-[#2563EB] focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => setShowRejectForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  variant="primary"
                  loading={reviewMutation.isPending}
                  disabled={!rejectFeedback.trim()}
                  onClick={() =>
                    reviewMutation.mutate({
                      status: ReviewStatus.REJECTED,
                      feedback: rejectFeedback.trim(),
                    })
                  }
                >
                  Return Task
                </Button>
              </div>
            </div>
          )}

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
                    ? 'border-[#2563EB] text-[#2563EB] font-semibold'
                    : 'border-transparent text-fx-text-secondary hover:text-fx-text-primary',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-fx-text-primary">
            {isLoading && !task ? (
              <TaskDetailSkeleton />
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

                      {/* Read-Only Progress Display */}
                      <div className="px-3.5 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-fx-text-muted text-[11px] font-medium">Progress</span>
                          <span className="font-mono font-bold text-sm text-fx-text-primary">{task?.progress || 0}%</span>
                        </div>
                        <div className="w-full h-2 bg-fx-bg-hover rounded-full overflow-hidden border border-fx-border/50">
                          <div
                            className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                            style={{ width: `${task?.progress || 0}%` }}
                          />
                        </div>
                        {latestUpdate && (
                          <div className="pt-0.5 text-[11px] text-fx-text-muted flex items-center justify-between">
                            <span>
                              Last updated by:{' '}
                              <span className="font-semibold text-fx-text-secondary">
                                {latestUpdate.user?.firstName} {latestUpdate.user?.lastName}
                              </span>
                            </span>
                            <span className="font-mono text-[10px]">{formatDate(latestUpdate.createdAt)}</span>
                          </div>
                        )}
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
                      {task?.status === TaskStatus.DONE && (
                        <div className="px-3.5 py-2.5 flex items-center justify-between bg-emerald-50/50">
                          <span className="text-emerald-700 text-[11px] font-medium">Completed</span>
                          <div className="text-right text-[11px]">
                            <span className="font-semibold text-emerald-800">100% Finalized</span>
                            {task.completedDate && (
                              <span className="text-emerald-600 block text-[10px] font-mono">
                                {formatDate(task.completedDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {task?.reviews && task.reviews.length > 0 && task.reviews[0]?.reviewer && (
                        <div className="px-3.5 py-2.5 flex items-center justify-between">
                          <span className="text-fx-text-muted text-[11px] font-medium">Review Status</span>
                          <div className="text-right text-[11px]">
                            <span className="font-semibold text-fx-text-primary">
                              {task.reviews[0].status === 'APPROVED' ? 'Approved' : 'Changes Requested'} by {task.reviews[0].reviewer.firstName} {task.reviews[0].reviewer.lastName}
                            </span>
                            {task.reviews[0].feedback && (
                              <p className="text-fx-text-secondary text-[10px] italic max-w-xs truncate">
                                &quot;{task.reviews[0].feedback}&quot;
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Waiting Notice if WAITING */}
                    {task?.status === TaskStatus.WAITING && unfinishedDeps.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                          <Lock className="w-3.5 h-3.5 text-amber-700" />
                          <span>This task cannot start yet.</span>
                        </div>
                        <p className="text-amber-700 text-[11px]">
                          Waiting for:{' '}
                          {unfinishedDeps
                            .map(
                              (d: any) =>
                                `${d.predecessorTask?.humanId} · ${d.predecessorTask?.title}`,
                            )
                            .join(', ')}
                        </p>
                      </div>
                    )}

                    {/* Blocker Notice if Blocked */}
                    {(task?.isManualBlocked || task?.status === TaskStatus.BLOCKED) && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-red-800">
                          <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                          <span>Task Blocked</span>
                        </div>
                        <p className="text-red-700 text-[11px]">
                          {task.manualBlockReason || 'A blocker has been reported on this deliverable.'}
                        </p>
                      </div>
                    )}

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
                                      ? 'bg-[#EEF4FF] border-[#2563EB]/30'
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
                    {/* Header Copy */}
                    <div className="pb-1 border-b border-fx-border/60 flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-fx-text-primary">
                        Daily Updates
                      </h4>
                      <span className="text-[11px] text-fx-text-muted">
                        {isAdminOrOwner
                          ? 'Progress updates from the assigned team member.'
                          : isAssignee && task?.status === TaskStatus.IN_PROGRESS
                            ? 'Submit your daily progress and blockers.'
                            : 'Progress updates from the assigned team member.'}
                      </span>
                    </div>

                    {/* Submission Form OR Status Notices */}
                    {isAdminOrOwner ? (
                      /* Admin: Read-only notice, no input form */
                      null
                    ) : isAssignee ? (
                      /* Assigned Team Member */
                      task?.status === TaskStatus.IN_PROGRESS ? (
                        <div className="bg-white border border-fx-border rounded-lg p-4 space-y-3.5">
                          <h4 className="text-xs font-semibold text-fx-text-primary">
                            Submit Daily Progress Update
                          </h4>

                          {/* Progress Slider */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-fx-text-secondary font-medium">Completion:</span>
                              <span className="font-mono font-bold text-[#2563EB]">{updateProgress}%</span>
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
                              className="w-full accent-[#2563EB] cursor-pointer"
                            />
                          </div>

                          {/* Completed Today */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-fx-text-secondary">
                              What did you complete today? *
                            </label>
                            <textarea
                              rows={2}
                              placeholder="e.g. Implemented bus controls and UI update..."
                              value={completedToday}
                              onChange={(e) => setCompletedToday(e.target.value)}
                              className="w-full rounded-md border border-fx-border bg-fx-bg p-2 text-xs focus:border-[#2563EB] focus:outline-none"
                            />
                          </div>

                          {/* Next Steps */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-fx-text-secondary">
                              Next Steps: *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Test physics and submit final review..."
                              value={nextStepNote}
                              onChange={(e) => setNextStepNote(e.target.value)}
                              className="w-full rounded-md border border-fx-border bg-fx-bg px-2.5 py-1.5 text-xs focus:border-[#2563EB] focus:outline-none"
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
                              className="w-full rounded-md border border-fx-border bg-fx-bg px-2.5 py-1.5 text-xs focus:border-[#2563EB] focus:outline-none"
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
                      ) : task?.status === TaskStatus.READY ? (
                        <div className="bg-[#EEF4FF] border border-[#2563EB]/30 rounded-lg p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-fx-text-primary">Start work to submit daily updates.</span>
                            {canStart && (
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
                          <p className="text-fx-text-secondary">
                            This task is assigned to you and ready to start. Once work is started, you can log daily progress here.
                          </p>
                        </div>
                      ) : task?.status === TaskStatus.WAITING ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-1.5 text-xs text-amber-900">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Lock className="w-3.5 h-3.5 text-amber-700" />
                            <span>This task cannot start yet.</span>
                          </div>
                          <p className="text-amber-700 text-[11px]">
                            Waiting for: {unfinishedDeps.length > 0 ? unfinishedDeps.map((d: any) => d.predecessorTask?.humanId).join(', ') : 'prerequisite tasks'}
                          </p>
                        </div>
                      ) : task?.status === TaskStatus.IN_REVIEW ? (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-1 text-xs text-purple-900">
                          <span className="font-semibold">Work Submitted for Review</span>
                          <p className="text-purple-700 text-[11px]">
                            Your deliverable has been submitted for Admin review. Progress updates are paused until review is completed.
                          </p>
                        </div>
                      ) : task?.status === TaskStatus.DONE ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 space-y-1 text-xs text-emerald-900">
                          <span className="font-semibold">Task Completed</span>
                          <p className="text-emerald-700 text-[11px]">
                            This deliverable has been approved and completed (100%).
                          </p>
                        </div>
                      ) : null
                    ) : (
                      /* Unassigned Team Member: Read-only notice */
                      <div className="bg-fx-bg border border-fx-border rounded-lg p-3 text-xs text-fx-text-muted">
                        Progress updates from the assigned team member.
                      </div>
                    )}

                    {/* Historical Updates List */}
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-fx-text-muted">
                        Progress History
                      </h4>
                      {progressUpdates.length === 0 ? (
                        <div className="text-xs text-fx-text-muted italic bg-fx-bg p-4 rounded-lg border border-fx-border/60 text-center">
                          No progress updates have been submitted yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {progressUpdates.map((upd: any) => (
                            <div
                              key={upd.id}
                              className="bg-white border border-fx-border rounded-lg p-3.5 space-y-2 shadow-sm"
                            >
                              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-fx-border/50">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-fx-text-primary">
                                    {upd.user?.firstName} {upd.user?.lastName}
                                  </span>
                                  <span className="text-[10px] text-fx-text-muted font-mono">
                                    {formatDate(upd.createdAt)}
                                  </span>
                                </div>
                                <span className="font-mono text-[#2563EB] font-bold bg-[#EEF4FF] px-2 py-0.5 rounded text-xs">
                                  {upd.progressAfter ?? upd.progress}%
                                </span>
                              </div>

                              {upd.completedToday && (
                                <div className="text-xs">
                                  <span className="text-[11px] font-semibold text-fx-text-secondary block">Completed:</span>
                                  <p className="text-fx-text-primary mt-0.5 leading-relaxed">{upd.completedToday}</p>
                                </div>
                              )}

                              {upd.nextStep && (
                                <div className="text-xs">
                                  <span className="text-[11px] font-semibold text-fx-text-secondary block">Next:</span>
                                  <p className="text-fx-text-secondary mt-0.5 leading-relaxed">{upd.nextStep}</p>
                                </div>
                              )}

                              <div className="text-xs">
                                <span className="text-[11px] font-semibold text-fx-text-secondary block">Blocker:</span>
                                {upd.blocker ? (
                                  <p className="text-fx-semantic-danger font-medium mt-0.5">{upd.blocker}</p>
                                ) : (
                                  <p className="text-fx-text-muted mt-0.5">None</p>
                                )}
                              </div>
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

                    {/* Subtasks Notice for Read-only Viewers */}
                    {!canUpdateProgress && (
                      <div className="text-[11px] text-fx-text-muted bg-fx-bg p-2.5 rounded border border-fx-border/60">
                        {isAdminOrOwner
                          ? 'Subtask checklist execution is managed by the assigned team member.'
                          : 'Subtask completion can only be updated by the assigned team member.'}
                      </div>
                    )}

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
                              onClick={() => {
                                if (!canUpdateProgress) return;
                                toggleSubtaskMutation.mutate({
                                  subtaskId: st.id,
                                  isCompleted: !isCompleted,
                                });
                              }}
                              className={cn(
                                'p-3 flex items-center gap-2.5 fx-transition',
                                canUpdateProgress
                                  ? 'hover:bg-fx-bg-hover cursor-pointer'
                                  : 'cursor-default select-none opacity-90',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                disabled={!canUpdateProgress}
                                onChange={() => {}}
                                className={cn(
                                  'w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]',
                                  canUpdateProgress ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                                )}
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
