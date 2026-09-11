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

function marketingStatusLabel(status?: string) {
  return ({ UNASSIGNED: 'Unassigned', READY: 'Not Started', IN_PROGRESS: 'In Progress', IN_REVIEW: 'Ready for Review', BLOCKED: 'Blocked', DONE: 'Done', N_A: 'N/A' } as Record<string, string>)[status || ''] || String(status || 'Not Started').replace(/_/g, ' ');
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
  const [checklistEvidenceUrl, setChecklistEvidenceUrl] = useState('');
  const [checklistNotes, setChecklistNotes] = useState('');

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
      setChecklistEvidenceUrl(task.checklistEvidenceUrl || '');
      setChecklistNotes(task.checklistNotes || '');
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
    mutationFn: ({
      status,
      feedback,
      completeTask,
    }: {
      status: ReviewStatus;
      feedback?: string;
      completeTask?: boolean;
    }) =>
      api.post(`/tasks/${taskId}/review`, { status, feedback, completeTask }),
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

  const checklistUpdateMutation = useMutation({
    mutationFn: (status: TaskStatus) => api.patch(`/tasks/${taskId}`, {
      status,
      checklistEvidenceUrl: checklistEvidenceUrl.trim() || null,
      checklistNotes: checklistNotes.trim() || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['marketing'] });
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
  const isMarketingChecklist = task?.workstream === 'MARKETING' && task?.workType === 'STANDARD_CHECKLIST';
  const unfinishedDeps = blockedBy.filter((b: any) => b.predecessorTask?.status !== TaskStatus.DONE);
  const latestUpdate = progressUpdates[0];

  const mutationError =
    updateStatusMutation.error ||
    reviewMutation.error ||
    progressUpdateMutation.error ||
    checklistUpdateMutation.error ||
    createSubtaskMutation.error ||
    toggleSubtaskMutation.error;
  const mutationErrorMessage = mutationError instanceof Error ? mutationError.message : '';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6">
        <div className="w-screen max-w-[460px] bg-white border-l border-[#E8EBEF] shadow-xl flex flex-col justify-between animate-drawerIn">
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#E8EBEF] flex items-start justify-between gap-3 bg-white">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-medium text-[#60666F] bg-[#F8F9FB] px-1.5 py-0.5 rounded-[5px] border border-[#E8EBEF]">
                  {task?.humanId || '...'}
                </span>
                {task?.project && (
                  <span className="text-xs text-[#60666F] truncate font-normal">
                    {task.project.name}
                  </span>
                )}
              </div>
              <h2 className="text-[15px] font-semibold text-[#17191C] tracking-tight leading-snug">
                {task?.title || 'Loading deliverable...'}
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-[6px] text-[#8C939E] hover:text-[#17191C] hover:bg-[#F8F9FB] transition-colors shrink-0"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Bar (Status + Quick Actions) */}
          <div className="px-5 py-2.5 bg-[#F8F9FB] border-b border-[#E8EBEF] flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#8C939E] text-[11px]">Status:</span>
              {isMarketingChecklist ? <span className="rounded-[5px] border border-[#D9DEE5] bg-white px-2 py-0.5 text-[10px] font-medium text-[#44505E]">{marketingStatusLabel(task?.status)}</span> : <StatusPill status={task?.status || TaskStatus.TODO} size="sm" />}
              {task?.status === TaskStatus.IN_REVIEW && canReview && (
                <span className="px-1.5 py-0.5 rounded-[4px] bg-[#F5F1FB] text-[#6D52A3] font-medium text-[10px] border border-[#E4D7F5]">
                  Review Required
                </span>
              )}
            </div>

            {/* Role / State Actions */}
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              {canStart && (
                <Button
                  size="xs"
                  variant="primary"
                  loading={updateStatusMutation.isPending}
                  onClick={() => updateStatusMutation.mutate(TaskStatus.IN_PROGRESS)}
                  leftIcon={<Play className="w-3 h-3 fill-white" />}
                >
                  {isMarketingChecklist ? 'Start Checklist' : 'Start Work'}
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
                  {isMarketingChecklist ? 'Submit Ready for Review' : 'Submit Progress Review'}
                </Button>
              )}

              {canReview && (
                <>
                  {!isMarketingChecklist && <Button
                    size="xs"
                    variant="primary"
                    loading={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        status: ReviewStatus.APPROVED,
                        completeTask: false,
                      })
                    }
                    leftIcon={<CheckCircle2 className="w-3 h-3" />}
                  >
                    Approve Progress
                  </Button>}
                  <Button
                    size="xs"
                    variant="secondary"
                    loading={reviewMutation.isPending}
                    onClick={() =>
                      reviewMutation.mutate({
                        status: ReviewStatus.APPROVED,
                        completeTask: true,
                      })
                    }
                    leftIcon={<CheckCircle2 className="w-3 h-3" />}
                  >
                    {isMarketingChecklist ? 'Approve Checklist' : 'Approve & Complete'}
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
            <div className="mx-5 mt-3 p-3.5 bg-[#FFF7E8] border border-[#F0DFB7] rounded-[10px] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#9A6515]">Return Work for Changes</span>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(false)}
                  className="text-[#8C939E] hover:text-[#17191C] p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-[#7A5010] leading-relaxed">
                Provide feedback explaining why changes are requested so the assigned team member can revise their deliverable.
              </p>
              <textarea
                rows={2}
                placeholder="e.g. Please recheck physics calculations and verify brake torque on slopes..."
                value={rejectFeedback}
                onChange={(e) => setRejectFeedback(e.target.value)}
                className="w-full rounded-[8px] border border-[#E0CE9E] bg-white p-2 text-xs focus:border-[#2463EB] focus:outline-none"
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
            <div className="mx-5 mt-3 rounded-[8px] border border-[#F2C0C0] bg-[#FCEEEE] px-3 py-2 text-xs font-medium text-[#B54747]">
              {mutationErrorMessage}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="px-5 border-b border-[#E8EBEF] flex items-center gap-5 text-xs font-medium bg-white">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'updates', label: isMarketingChecklist ? 'Status & Evidence' : 'Daily Updates' },
              { id: 'subtasks', label: `Subtasks (${subtasks.length})` },
              { id: 'activity', label: 'Activity' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'py-2.5 border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-[#2463EB] text-[#2463EB] font-semibold'
                    : 'border-transparent text-[#60666F] hover:text-[#17191C]',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-[#17191C]">
            {isLoading && !task ? (
              <TaskDetailSkeleton />
            ) : (
              <>
                {/* TAB 1: OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    {/* Aligned Property Table */}
                    <div className="bg-white border border-[#E8EBEF] rounded-[10px] divide-y divide-[#E8EBEF]">
                      <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-[#60666F] text-[11px] font-medium">Assignee</span>
                        <span className="font-medium text-[#17191C]">
                          {task?.assignee
                            ? `${task.assignee.firstName} ${task.assignee.lastName}`
                            : 'Unassigned'}
                        </span>
                      </div>
                      <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-[#60666F] text-[11px] font-medium">Priority</span>
                        <PriorityBadge priority={task?.priority || TaskPriority.MEDIUM} />
                      </div>

                      {/* Read-Only Progress Display */}
                      {!isMarketingChecklist && <div className="px-3.5 py-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[#60666F] text-[11px] font-medium">Progress</span>
                          <span className="font-mono font-semibold text-xs text-[#17191C]">{task?.progress || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#F3F5F7] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2463EB] rounded-full transition-all duration-300"
                            style={{ width: `${task?.progress || 0}%` }}
                          />
                        </div>
                        {latestUpdate && (
                          <div className="pt-0.5 text-[11px] text-[#8C939E] flex items-center justify-between">
                            <span>
                              Last updated by:{' '}
                              <span className="font-medium text-[#60666F]">
                                {latestUpdate.user?.firstName} {latestUpdate.user?.lastName}
                              </span>
                            </span>
                            <span className="font-mono text-[10px]">{formatDate(latestUpdate.createdAt)}</span>
                          </div>
                        )}
                      </div>}

                      {isMarketingChecklist && (
                        <>
                          <div className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                            <span className="text-[#60666F] text-[11px] font-medium">Timing</span>
                            <span className="text-right text-[#17191C]">{task?.checklistStage || 'Not specified'}</span>
                          </div>
                          <div className="px-3.5 py-2.5 flex items-center justify-between gap-4">
                            <span className="text-[#60666F] text-[11px] font-medium">Evidence</span>
                            {task?.checklistEvidenceUrl ? <a href={task.checklistEvidenceUrl} target="_blank" rel="noreferrer" className="max-w-64 truncate font-medium text-[#245EC7]">Open evidence</a> : <span className="text-[#8C939E]">Not added</span>}
                          </div>
                          {task?.checklistNotes && <div className="px-3.5 py-2.5"><span className="text-[#60666F] text-[11px] font-medium">Operational note</span><p className="mt-1 whitespace-pre-wrap text-[#17191C]">{task.checklistNotes}</p></div>}
                        </>
                      )}

                      <div className="px-3.5 py-2.5 flex items-center justify-between">
                        <span className="text-[#60666F] text-[11px] font-medium">Due Date</span>
                        <span className="font-mono text-[#60666F]">
                          {task?.dueDate ? formatDate(task.dueDate) : 'No deadline'}
                        </span>
                      </div>
                      {task?.milestone && (
                        <div className="px-3.5 py-2.5 flex items-center justify-between">
                          <span className="text-[#60666F] text-[11px] font-medium">Milestone</span>
                          <span className="font-medium text-[#17191C]">{task.milestone.name}</span>
                        </div>
                      )}
                      {task?.status === TaskStatus.DONE && (
                        <div className="px-3.5 py-2.5 flex items-center justify-between bg-[#EDF7F2]">
                          <span className="text-[#26715A] text-[11px] font-medium">Completed</span>
                          <div className="text-right text-[11px]">
                            <span className="font-semibold text-[#26715A]">100% Finalized</span>
                            {task.completedDate && (
                              <span className="text-[#26715A]/80 block text-[10px] font-mono">
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
                      <div className="p-3 bg-[#FFF7E8] border border-[#F0DFB7] rounded-[10px] text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-[#9A6515]">
                          <Lock className="w-3.5 h-3.5 text-[#9A6515]" />
                          <span>This deliverable cannot start yet</span>
                        </div>
                        <p className="text-[#7A5010] text-[11px]">
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
                      <div className="p-3 bg-[#FCEEEE] border border-[#F2C0C0] rounded-[10px] text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-[#B54747]">
                          <AlertCircle className="w-3.5 h-3.5 text-[#B54747]" />
                          <span>Task Blocked</span>
                        </div>
                        <p className="text-[#963737] text-[11px]">
                          {task.manualBlockReason || 'A blocker has been reported on this deliverable.'}
                        </p>
                      </div>
                    )}

                    {/* Dependency Chain Visualization */}
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider text-[#8C939E]">
                        Dependencies
                      </h4>

                      {/* Waiting on Predecessors */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-[#60666F] font-medium">
                          Prerequisites (Waiting on):
                        </p>
                        {blockedBy.length === 0 ? (
                          <p className="text-[11px] text-[#8C939E] italic bg-[#F8F9FB] p-2.5 rounded-[8px] border border-[#E8EBEF]">
                            No prerequisite tasks required.
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
                                    'p-2.5 rounded-[8px] border flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs',
                                    isDone
                                      ? 'bg-[#EEF4FF] border-[#D0E1FD]'
                                      : 'bg-[#FFF7E8] border-[#F0DFB7] hover:bg-[#FFF3DA]',
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-medium text-[11px] shrink-0 text-[#60666F]">
                                      {pred?.humanId}
                                    </span>
                                    <span className="truncate font-medium text-[#17191C]">{pred?.title}</span>
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
                        <p className="text-[11px] text-[#60666F] font-medium">
                          Unlocks (Successors):
                        </p>
                        {blocking.length === 0 ? (
                          <p className="text-[11px] text-[#8C939E] italic bg-[#F8F9FB] p-2.5 rounded-[8px] border border-[#E8EBEF]">
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
                                  className="p-2.5 rounded-[8px] bg-[#F8F9FB] border border-[#E8EBEF] hover:bg-[#F0F2F5] flex items-center justify-between gap-2 cursor-pointer transition-colors text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono font-medium text-[#8C939E] text-[11px] shrink-0">
                                      {succ?.humanId}
                                    </span>
                                    <span className="truncate font-medium text-[#17191C]">{succ?.title}</span>
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
                      <h4 className="text-[11px] font-medium uppercase tracking-wider text-[#8C939E]">
                        Description & Specification
                      </h4>
                      <div className="bg-[#F8F9FB] border border-[#E8EBEF] rounded-[10px] p-3.5 text-xs text-[#17191C] leading-relaxed whitespace-pre-wrap">
                        {task?.description || 'No description provided for this deliverable.'}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: DAILY UPDATES */}
                {activeTab === 'updates' && (isMarketingChecklist ? (
                  <div className="space-y-4">
                    <div className="border-b border-[#E8EBEF] pb-3">
                      <h4 className="text-xs font-semibold text-[#17191C]">Checklist Status</h4>
                      <p className="mt-1 text-[11px] text-[#60666F]">Record evidence or a short operational note, then submit the completed item to Admin for review.</p>
                    </div>
                    {(task?.status === TaskStatus.IN_PROGRESS || task?.status === TaskStatus.BLOCKED) && isAssignee ? (
                      <div className="space-y-3 rounded-[8px] border border-[#E8EBEF] p-4">
                        <label className="grid gap-1 text-[11px] font-medium text-[#60666F]">Evidence URL (optional)<input type="url" placeholder="https://..." value={checklistEvidenceUrl} onChange={(event) => setChecklistEvidenceUrl(event.target.value)} className="h-9 rounded-[6px] border border-[#D9DEE5] px-2.5 text-xs text-[#17191C] focus:border-[#2463EB] focus:outline-none" /></label>
                        <label className="grid gap-1 text-[11px] font-medium text-[#60666F]">Operational note<textarea rows={3} placeholder="What was completed, or what is blocking this item?" value={checklistNotes} onChange={(event) => setChecklistNotes(event.target.value)} className="rounded-[6px] border border-[#D9DEE5] p-2.5 text-xs text-[#17191C] focus:border-[#2463EB] focus:outline-none" /></label>
                        <div className="flex flex-wrap justify-end gap-2">
                          {task.status === TaskStatus.BLOCKED ? <Button size="xs" variant="secondary" loading={checklistUpdateMutation.isPending} onClick={() => checklistUpdateMutation.mutate(TaskStatus.IN_PROGRESS)}>Resume</Button> : <Button size="xs" variant="secondary" disabled={!checklistNotes.trim()} loading={checklistUpdateMutation.isPending} onClick={() => checklistUpdateMutation.mutate(TaskStatus.BLOCKED)}>Mark Blocked</Button>}
                          <Button size="xs" loading={checklistUpdateMutation.isPending} disabled={!checklistEvidenceUrl.trim() && !checklistNotes.trim()} onClick={() => checklistUpdateMutation.mutate(TaskStatus.IN_REVIEW)} leftIcon={<Send className="h-3 w-3" />}>Submit Ready for Review</Button>
                        </div>
                      </div>
                    ) : task?.status === TaskStatus.READY && isAssignee ? (
                      <div className="flex items-center justify-between gap-3 rounded-[8px] border border-[#D0E1FD] bg-[#EEF4FF] p-4"><p className="text-[11px] text-[#60666F]">This checklist item is ready to begin.</p><Button size="xs" onClick={() => updateStatusMutation.mutate(TaskStatus.IN_PROGRESS)} leftIcon={<Play className="h-3 w-3" />}>Start Checklist</Button></div>
                    ) : task?.status === TaskStatus.IN_REVIEW ? (
                      <div className="rounded-[8px] border border-[#E4D7F5] bg-[#F5F1FB] p-4 text-[11px] text-[#594285]">Submitted to Admin. The item becomes Done only after approval.</div>
                    ) : task?.status === TaskStatus.DONE ? (
                      <div className="rounded-[8px] border border-[#C6E6D6] bg-[#EDF7F2] p-4 text-[11px] text-[#1E5947]">This checklist item has been reviewed and completed.</div>
                    ) : (
                      <div className="rounded-[8px] border border-[#E8EBEF] bg-[#F8F9FB] p-4 text-[11px] text-[#60666F]">Status and evidence are read-only for this item.</div>
                    )}
                    {(task?.checklistEvidenceUrl || task?.checklistNotes) && <div className="space-y-2 border-t border-[#E8EBEF] pt-4"><h4 className="text-[11px] font-medium uppercase text-[#8C939E]">Latest Submission</h4>{task.checklistEvidenceUrl && <a href={task.checklistEvidenceUrl} target="_blank" rel="noreferrer" className="block truncate text-xs font-medium text-[#245EC7]">{task.checklistEvidenceUrl}</a>}{task.checklistNotes && <p className="whitespace-pre-wrap text-xs text-[#60666F]">{task.checklistNotes}</p>}</div>}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Header Copy */}
                    <div className="pb-1 border-b border-[#E8EBEF] flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-[#17191C]">
                        Daily Updates
                      </h4>
                      <span className="text-[11px] text-[#8C939E]">
                        {isAdminOrOwner
                          ? 'Progress updates from the assigned team member.'
                          : isAssignee && task?.status === TaskStatus.IN_PROGRESS
                            ? 'Submit your daily progress and blockers.'
                            : 'Progress updates from the assigned team member.'}
                      </span>
                    </div>

                    {/* Submission Form OR Status Notices */}
                    {isAdminOrOwner && !isAssignee ? (
                      /* Admin: Read-only notice, no input form */
                      null
                    ) : isAssignee ? (
                      /* Assigned Team Member */
                      task?.status === TaskStatus.IN_PROGRESS ? (
                        <div className="bg-white border border-[#E8EBEF] rounded-[10px] p-4 space-y-3.5">
                          <h4 className="text-xs font-semibold text-[#17191C]">
                            Submit Daily Progress Update
                          </h4>

                          {/* Progress Slider */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[#60666F] font-medium">Completion:</span>
                              <span className="font-mono font-bold text-[#2463EB]">{updateProgress}%</span>
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
                              className="w-full accent-[#2463EB] cursor-pointer"
                            />
                          </div>

                          {/* Completed Today */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#60666F]">
                              What did you complete today? *
                            </label>
                            <textarea
                              rows={2}
                              placeholder="e.g. Implemented bus controls and UI update..."
                              value={completedToday}
                              onChange={(e) => setCompletedToday(e.target.value)}
                              className="w-full rounded-[8px] border border-[#E8EBEF] bg-[#F8F9FB] p-2 text-xs focus:border-[#2463EB] focus:outline-none"
                            />
                          </div>

                          {/* Next Steps */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#60666F]">
                              Next Steps: *
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Test physics and submit final review..."
                              value={nextStepNote}
                              onChange={(e) => setNextStepNote(e.target.value)}
                              className="w-full rounded-[8px] border border-[#E8EBEF] bg-[#F8F9FB] px-2.5 py-1.5 text-xs focus:border-[#2463EB] focus:outline-none"
                            />
                          </div>

                          {/* Optional Blocker */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-medium text-[#60666F] flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 text-[#8C939E]" />
                              <span>Any blockers? (Optional)</span>
                            </label>
                            <input
                              type="text"
                              placeholder="Leave blank if unblocked..."
                              value={blockerNote}
                              onChange={(e) => setBlockerNote(e.target.value)}
                              className="w-full rounded-[8px] border border-[#E8EBEF] bg-[#F8F9FB] px-2.5 py-1.5 text-xs focus:border-[#2463EB] focus:outline-none"
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
                        <div className="bg-[#EEF4FF] border border-[#D0E1FD] rounded-[10px] p-4 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#17191C]">Start work to submit daily updates.</span>
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
                          <p className="text-[#60666F]">
                            This task is assigned to you and ready to start. Once work is started, you can log daily progress here.
                          </p>
                        </div>
                      ) : task?.status === TaskStatus.WAITING ? (
                        <div className="bg-[#FFF7E8] border border-[#F0DFB7] rounded-[10px] p-4 space-y-1.5 text-xs text-[#9A6515]">
                          <div className="flex items-center gap-1.5 font-medium">
                            <Lock className="w-3.5 h-3.5 text-[#9A6515]" />
                            <span>This task cannot start yet.</span>
                          </div>
                          <p className="text-[#7A5010] text-[11px]">
                            Waiting for: {unfinishedDeps.length > 0 ? unfinishedDeps.map((d: any) => d.predecessorTask?.humanId).join(', ') : 'prerequisite tasks'}
                          </p>
                        </div>
                      ) : task?.status === TaskStatus.IN_REVIEW ? (
                        <div className="bg-[#F5F1FB] border border-[#E4D7F5] rounded-[10px] p-4 space-y-1 text-xs text-[#6D52A3]">
                          <span className="font-medium">Progress Submitted for Review</span>
                          <p className="text-[#594285] text-[11px]">
                            Your current {task?.progress || 0}% progress is with Admin. Updates resume after the review decision.
                          </p>
                        </div>
                      ) : task?.status === TaskStatus.DONE ? (
                        <div className="bg-[#EDF7F2] border border-[#C6E6D6] rounded-[10px] p-4 space-y-1 text-xs text-[#26715A]">
                          <span className="font-medium">Task Completed</span>
                          <p className="text-[#1E5947] text-[11px]">
                            This deliverable has been approved and completed (100%).
                          </p>
                        </div>
                      ) : null
                    ) : (
                      /* Unassigned Team Member: Read-only notice */
                      <div className="bg-[#F8F9FB] border border-[#E8EBEF] rounded-[10px] p-3 text-xs text-[#8C939E]">
                        Progress updates from the assigned team member.
                      </div>
                    )}

                    {/* Historical Updates List */}
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-medium uppercase tracking-wider text-[#8C939E]">
                        Progress History
                      </h4>
                      {progressUpdates.length === 0 ? (
                        <div className="text-xs text-[#8C939E] italic bg-[#F8F9FB] p-4 rounded-[10px] border border-[#E8EBEF] text-center">
                          No progress updates have been submitted yet.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {progressUpdates.map((upd: any) => (
                            <div
                              key={upd.id}
                              className="bg-white border border-[#E8EBEF] rounded-[10px] p-3.5 space-y-2"
                            >
                              <div className="flex items-center justify-between text-xs pb-1.5 border-b border-[#E8EBEF]">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-[#17191C]">
                                    {upd.user?.firstName} {upd.user?.lastName}
                                  </span>
                                  <span className="text-[10px] text-[#8C939E] font-mono">
                                    {formatDate(upd.createdAt)}
                                  </span>
                                </div>
                                <span className="font-mono text-[#2463EB] font-semibold bg-[#EEF4FF] px-2 py-0.5 rounded-[4px] text-xs">
                                  {upd.progressAfter ?? upd.progress}%
                                </span>
                              </div>

                              {upd.completedToday && (
                                <div className="text-xs">
                                  <span className="text-[11px] font-medium text-[#60666F] block">Completed:</span>
                                  <p className="text-[#17191C] mt-0.5 leading-relaxed">{upd.completedToday}</p>
                                </div>
                              )}

                              {upd.nextStep && (
                                <div className="text-xs">
                                  <span className="text-[11px] font-medium text-[#60666F] block">Next:</span>
                                  <p className="text-[#60666F] mt-0.5 leading-relaxed">{upd.nextStep}</p>
                                </div>
                              )}

                              <div className="text-xs">
                                <span className="text-[11px] font-medium text-[#60666F] block">Blocker:</span>
                                {upd.blocker ? (
                                  <p className="text-[#B54747] font-medium mt-0.5">{upd.blocker}</p>
                                ) : (
                                  <p className="text-[#8C939E] mt-0.5">None</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}


                {/* TAB 3: SUBTASKS */}
                {activeTab === 'subtasks' && (
                  <div className="space-y-4">
                    {/* Add Subtask */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add subtask deliverable..."
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        className="h-8 text-xs bg-[#F8F9FB]"
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
                      <div className="text-[11px] text-[#8C939E] bg-[#F8F9FB] p-2.5 rounded-[8px] border border-[#E8EBEF]">
                        {isAdminOrOwner
                          ? 'Subtask checklist execution is managed by the assigned team member.'
                          : 'Subtask completion can only be updated by the assigned team member.'}
                      </div>
                    )}

                    {/* Subtasks List */}
                    {subtasks.length === 0 ? (
                      <p className="text-xs text-[#8C939E] italic bg-[#F8F9FB] p-4 rounded-[10px] border border-[#E8EBEF] text-center">
                        No subtasks added.
                      </p>
                    ) : (
                      <div className="bg-white border border-[#E8EBEF] rounded-[10px] divide-y divide-[#E8EBEF] overflow-hidden">
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
                                'p-3 flex items-center gap-2.5 transition-colors',
                                canUpdateProgress
                                  ? 'hover:bg-[#F8F9FB] cursor-pointer'
                                  : 'cursor-default select-none opacity-90',
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isCompleted}
                                disabled={!canUpdateProgress}
                                onChange={() => {}}
                                className={cn(
                                  'w-4 h-4 rounded-[4px] text-[#2463EB] accent-[#2463EB]',
                                  canUpdateProgress ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                                )}
                              />
                              <span
                                className={cn(
                                  'text-xs flex-1 truncate',
                                  isCompleted && 'line-through text-[#8C939E]',
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
                    <h4 className="text-[11px] font-medium uppercase tracking-wider text-[#8C939E]">
                      Audit & Activity History
                    </h4>
                    {activityLogs.length === 0 ? (
                      <p className="text-xs text-[#8C939E] italic bg-[#F8F9FB] p-4 rounded-[10px] border border-[#E8EBEF] text-center">
                        No activity recorded yet.
                      </p>
                    ) : (
                      <div className="divide-y divide-[#E8EBEF] bg-white border border-[#E8EBEF] rounded-[10px]">
                        {activityLogs.map((act: any) => (
                          <div key={act.id} className="p-3 space-y-0.5 text-xs">
                            <p className="text-[#17191C]">{act.description || act.action || act.actionType}</p>
                            <p className="text-[10px] text-[#8C939E]">{formatDate(act.createdAt)}</p>
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
