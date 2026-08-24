'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Clock,
  Calendar,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  MessageSquare,
  History,
  Link2,
  Plus,
  Trash2,
  Check,
  RotateCcw,
  CheckSquare,
  AlertTriangle,
  Send,
  Upload,
  PlayCircle,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import {
  TaskStatus,
  TaskPriority,
  ReviewStatus,
  UserRole,
} from '@futurex/shared';
import { StatusPill } from '@/components/ui/StatusPill';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Progress } from '@/components/ui/Progress';
import { formatDate, formatTimeAgo, cn } from '@/lib/utils';
import * as DialogPrimitive from '@radix-ui/react-dialog';

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
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'activity' | 'files'>('details');
  const [newComment, setNewComment] = useState('');
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [blockerModalOpen, setBlockerModalOpen] = useState(false);
  const [blockerReasonInput, setBlockerReasonInput] = useState('');
  const [selectedDepTaskId, setSelectedDepTaskId] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => (taskId ? api.get(`/tasks/${taskId}`) : null),
    enabled: !!taskId && open,
  });

  const { data: projectTasks } = useQuery({
    queryKey: ['projectTasks', task?.projectId],
    queryFn: () => (task?.projectId ? api.get(`/tasks?projectId=${task.projectId}`) : []),
    enabled: !!task?.projectId && open,
  });

  const { data: projectData } = useQuery({
    queryKey: ['project', task?.projectId],
    queryFn: () => (task?.projectId ? api.get(`/projects/${task.projectId}`) : null),
    enabled: !!task?.projectId && open,
  });

  // Determine if current user has Manager/Admin planning authority on this project
  const isManager =
    hasRole(UserRole.OWNER, UserRole.ADMIN) ||
    (user?.globalRole === UserRole.PROJECT_MANAGER && projectData?.projectManagerId === user?.id);

  const isAssignee = task?.assigneeId === user?.id;

  // Mutations
  const updateTaskMutation = useMutation({
    mutationFn: (updates: any) => api.patch(`/tasks/${taskId}`, updates),
    onSuccess: () => {
      setErrorMessage(null);
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to update task');
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => api.post('/comments', { taskId, content }),
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ status, feedback }: { status: ReviewStatus; feedback?: string }) =>
      api.post(`/tasks/${taskId}/review`, { status, feedback }),
    onSuccess: () => {
      setReviewFeedback('');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-work'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to submit review');
    },
  });

  const addDependencyMutation = useMutation({
    mutationFn: (predecessorTaskId: string) =>
      api.post('/dependencies', {
        predecessorTaskId,
        dependentTaskId: task.id,
      }),
    onSuccess: () => {
      setSelectedDepTaskId('');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (err: any) => {
      setErrorMessage(err.message || 'Failed to add dependency');
    },
  });

  const removeDependencyMutation = useMutation({
    mutationFn: (dependencyId: string) => api.delete(`/dependencies/${dependencyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: (title: string) =>
      api.post('/tasks', {
        title,
        projectId: task.projectId,
        parentTaskId: task.id,
      }),
    onSuccess: () => {
      setNewSubtaskTitle('');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !task) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', task.projectId);
    formData.append('taskId', task.id);

    try {
      await api.post('/files/upload', formData);
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    }
  };

  const handleReportBlocker = () => {
    if (!blockerReasonInput.trim()) return;
    updateTaskMutation.mutate({
      isManualBlocked: true,
      manualBlockReason: blockerReasonInput.trim(),
      status: TaskStatus.BLOCKED,
    });
    setBlockerModalOpen(false);
    setBlockerReasonInput('');
  };

  const handleClearBlocker = () => {
    updateTaskMutation.mutate({
      isManualBlocked: false,
      status: TaskStatus.IN_PROGRESS,
    });
  };

  if (!open) return null;

  const blockedByList = task?.blockedBy || [];
  const blockingList = task?.blocking || [];
  const hasUnfinishedPredecessors = blockedByList.some(
    (b: any) => b.predecessorTask?.status !== TaskStatus.DONE,
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px] fx-transition animate-fadeIn" />
        <DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-popover border-l border-fx-border focus:outline-none overflow-hidden animate-fadeIn">
          {isLoading || !task ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 border-2 border-fx-green border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-fx-text-muted">Loading task details...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-fx-border bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-fx-green bg-fx-green-soft px-2 py-1 rounded">
                    {task.humanId}
                  </span>
                  <span className="text-xs text-fx-text-muted font-medium">
                    {task.project?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="p-1 rounded text-fx-text-muted hover:text-fx-text-primary hover:bg-gray-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Error banner if validation rejected */}
              {errorMessage && (
                <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 text-xs text-red-700 font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    {errorMessage}
                  </span>
                  <button
                    onClick={() => setErrorMessage(null)}
                    className="text-red-500 hover:text-red-800"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Dependency Blocked Banner */}
              {hasUnfinishedPredecessors && (
                <div className="px-6 py-3 bg-red-50/70 border-b border-red-200/80 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-semibold text-red-800">
                      This task cannot start yet. Waiting for {blockedByList.filter((b: any) => b.predecessorTask?.status !== TaskStatus.DONE).length} prerequisite task(s).
                    </p>
                    <p className="text-red-700 mt-0.5">
                      Prerequisites must be marked DONE before this task automatically becomes READY.
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Blocked Banner */}
              {task.isManualBlocked && (
                <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-900">Manually Marked Blocked</p>
                      <p className="text-amber-800 mt-0.5">Reason: {task.manualBlockReason || 'No reason provided'}</p>
                    </div>
                  </div>
                  {(isAssignee || isManager) && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={handleClearBlocker}
                      className="shrink-0 bg-white"
                    >
                      Clear Blocker & Resume
                    </Button>
                  )}
                </div>
              )}

              {/* Review & Approval Action Banner */}
              {task.status === TaskStatus.IN_REVIEW && (
                <div className="px-6 py-3.5 bg-amber-50/90 border-b border-amber-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-600" /> Work Submitted for Review
                    </span>
                    {!isManager && (
                      <span className="text-[11px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                        Pending PM Approval
                      </span>
                    )}
                  </div>

                  {isManager ? (
                    <div className="space-y-2 mt-2">
                      <Input
                        placeholder="Feedback / notes (optional for approval, required for changes request)..."
                        value={reviewFeedback}
                        onChange={(e) => setReviewFeedback(e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() =>
                            reviewMutation.mutate({
                              status: ReviewStatus.APPROVED,
                              feedback: reviewFeedback,
                            })
                          }
                          isLoading={reviewMutation.isPending}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Approve & Mark Done
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            reviewMutation.mutate({
                              status: ReviewStatus.REJECTED,
                              feedback: reviewFeedback || 'Changes requested by Project Manager',
                            })
                          }
                          isLoading={reviewMutation.isPending}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1 text-red-600" /> Request Changes
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Your work on this task has been submitted. Your Project Manager will review the delivery and approve completion or request revisions.
                    </p>
                  )}
                </div>
              )}

              {/* Employee Fast-Action Workflow Bar */}
              {(isAssignee || isManager) && task.status !== TaskStatus.DONE && (
                <div className="px-6 py-2.5 bg-gray-50 border-b border-fx-border flex items-center justify-between gap-3 text-xs">
                  <span className="text-fx-text-muted font-medium">Quick Actions:</span>
                  <div className="flex items-center gap-2">
                    {task.status === TaskStatus.READY && (
                      <Button
                        size="xs"
                        variant="primary"
                        onClick={() =>
                          updateTaskMutation.mutate({
                            status: TaskStatus.IN_PROGRESS,
                            progress: task.progress === 0 ? 10 : task.progress,
                          })
                        }
                        isLoading={updateTaskMutation.isPending}
                        className="gap-1"
                      >
                        <PlayCircle className="w-3.5 h-3.5" /> Start Work
                      </Button>
                    )}

                    {task.status === TaskStatus.IN_PROGRESS && (
                      <>
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => updateTaskMutation.mutate({ status: TaskStatus.IN_REVIEW })}
                          isLoading={updateTaskMutation.isPending}
                          className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Submit for Review
                        </Button>
                        <Button
                          size="xs"
                          variant="secondary"
                          onClick={() => setBlockerModalOpen(true)}
                          className="gap-1 text-red-600 hover:bg-red-50"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Report Blocker
                        </Button>
                      </>
                    )}

                    {task.status === TaskStatus.BLOCKED && !task.isManualBlocked && (
                      <span className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Blocked by prerequisites
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Blocker Report Modal Dialog */}
              {blockerModalOpen && (
                <div className="p-4 bg-red-50 border-b border-red-200 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" /> Report Work Blocker
                    </span>
                    <button
                      onClick={() => setBlockerModalOpen(false)}
                      className="text-red-500 hover:text-red-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-red-800">
                    Describe what is preventing you from proceeding so your Project Manager can help unblock you.
                  </p>
                  <textarea
                    rows={2}
                    placeholder="E.g., Missing 3D rig export from animation team..."
                    value={blockerReasonInput}
                    onChange={(e) => setBlockerReasonInput(e.target.value)}
                    className="w-full p-2.5 rounded border border-red-300 bg-white text-xs text-fx-text-primary focus:outline-none focus:border-red-500"
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="xs" variant="secondary" onClick={() => setBlockerModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      size="xs"
                      variant="primary"
                      disabled={!blockerReasonInput.trim()}
                      onClick={handleReportBlocker}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Submit Blocker
                    </Button>
                  </div>
                </div>
              )}

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
                {/* Title */}
                <div>
                  {isManager ? (
                    <input
                      type="text"
                      defaultValue={task.title}
                      onBlur={(e) => {
                        if (e.target.value !== task.title) {
                          updateTaskMutation.mutate({ title: e.target.value });
                        }
                      }}
                      className="w-full text-lg font-bold text-fx-text-primary focus:outline-none border-b border-transparent focus:border-fx-green pb-1 fx-transition bg-transparent"
                    />
                  ) : (
                    <div className="text-lg font-bold text-fx-text-primary pb-1">
                      {task.title}
                    </div>
                  )}
                </div>

                {/* Primary Meta Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-fx-bg border border-fx-border/80 text-xs">
                  {/* Status */}
                  <div>
                    <span className="text-fx-text-muted font-medium block mb-1.5">Status</span>
                    {isManager ? (
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskMutation.mutate({ status: e.target.value })}
                        className="w-full bg-white border border-fx-border rounded px-2 py-1 font-medium text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
                      >
                        {Object.values(TaskStatus).map((st) => (
                          <option key={st} value={st}>
                            {st.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-0.5">
                        <StatusPill status={task.status} size="xs" />
                      </div>
                    )}
                  </div>

                  {/* Assignee */}
                  <div>
                    <span className="text-fx-text-muted font-medium block mb-1.5">Assignee</span>
                    {isManager ? (
                      <select
                        value={task.assigneeId || ''}
                        onChange={(e) =>
                          updateTaskMutation.mutate({
                            assigneeId: e.target.value === '' ? null : e.target.value,
                          })
                        }
                        className="w-full bg-white border border-fx-border rounded px-2 py-1 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
                      >
                        <option value="">Unassigned</option>
                        {projectData?.members?.map((m: any) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user.firstName} {m.user.lastName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Avatar
                          src={task.assignee?.avatarUrl}
                          firstName={task.assignee?.firstName}
                          lastName={task.assignee?.lastName}
                          size="xs"
                        />
                        <span className="font-medium text-fx-text-primary truncate">
                          {task.assignee
                            ? `${task.assignee.firstName} ${task.assignee.lastName}`
                            : 'Unassigned'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div>
                    <span className="text-fx-text-muted font-medium block mb-1.5">Priority</span>
                    {isManager ? (
                      <select
                        value={task.priority}
                        onChange={(e) => updateTaskMutation.mutate({ priority: e.target.value })}
                        className="w-full bg-white border border-fx-border rounded px-2 py-1 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green font-medium"
                      >
                        {Object.values(TaskPriority).map((pr) => (
                          <option key={pr} value={pr}>
                            {pr}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="mt-0.5">
                        <PriorityBadge priority={task.priority} />
                      </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div>
                    <span className="text-fx-text-muted font-medium block mb-1.5">Due Date</span>
                    {isManager ? (
                      <input
                        type="date"
                        value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                        onChange={(e) =>
                          updateTaskMutation.mutate({
                            dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                          })
                        }
                        className="w-full bg-white border border-fx-border rounded px-2 py-1 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
                      />
                    ) : (
                      <div className="flex items-center gap-1 mt-0.5 text-fx-text-secondary">
                        <Calendar className="w-3.5 h-3.5 text-fx-text-muted" />
                        <span>{formatDate(task.dueDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-fx-text-secondary">Progress</span>
                    <span className="font-mono text-fx-green font-bold">{task.progress}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={task.progress}
                    disabled={task.status === TaskStatus.DONE || (!isManager && !isAssignee)}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateTaskMutation.mutate({ progress: val });
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-fx-green"
                  />
                  {task.progress === 100 && task.status === TaskStatus.IN_PROGRESS && !isManager && (
                    <p className="text-[11px] text-amber-700 font-medium mt-1">
                      100% complete! Click <strong>Submit for Review</strong> above to notify your Project Manager.
                    </p>
                  )}
                </div>

                {/* Navigation Tabs */}
                <div className="border-b border-fx-border flex gap-6 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={cn(
                      'pb-2 border-b-2 fx-transition',
                      activeTab === 'details'
                        ? 'border-fx-green text-fx-green'
                        : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
                    )}
                  >
                    Overview & Dependencies
                  </button>
                  <button
                    onClick={() => setActiveTab('comments')}
                    className={cn(
                      'pb-2 border-b-2 fx-transition flex items-center gap-1.5',
                      activeTab === 'comments'
                        ? 'border-fx-green text-fx-green'
                        : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Comments ({task.comments?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('files')}
                    className={cn(
                      'pb-2 border-b-2 fx-transition flex items-center gap-1.5',
                      activeTab === 'files'
                        ? 'border-fx-green text-fx-green'
                        : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
                    )}
                  >
                    <Paperclip className="w-3.5 h-3.5" /> Files ({task.attachments?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={cn(
                      'pb-2 border-b-2 fx-transition flex items-center gap-1.5',
                      activeTab === 'activity'
                        ? 'border-fx-green text-fx-green'
                        : 'border-transparent text-fx-text-muted hover:text-fx-text-primary',
                    )}
                  >
                    <History className="w-3.5 h-3.5" /> Activity
                  </button>
                </div>

                {/* Tab: Overview & Dependencies */}
                {activeTab === 'details' && (
                  <div className="space-y-6 text-xs">
                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-fx-text-secondary mb-1.5">
                        Description
                      </label>
                      {isManager ? (
                        <textarea
                          defaultValue={task.description || ''}
                          placeholder="Add detailed task instructions, technical specs, or acceptance criteria..."
                          onBlur={(e) => {
                            if (e.target.value !== task.description) {
                              updateTaskMutation.mutate({ description: e.target.value });
                            }
                          }}
                          rows={3}
                          className="w-full bg-white border border-fx-border rounded-md p-3 text-xs text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none focus:border-fx-green leading-relaxed"
                        />
                      ) : (
                        <div className="p-3 bg-fx-bg rounded-md border border-fx-border text-fx-text-primary leading-relaxed whitespace-pre-wrap">
                          {task.description || 'No description provided.'}
                        </div>
                      )}
                    </div>

                    {/* DEPENDENCIES SECTION */}
                    <div className="p-4 rounded-lg border border-fx-border bg-white space-y-4">
                      <div className="flex items-center justify-between border-b border-fx-border/60 pb-2">
                        <span className="font-semibold text-fx-text-primary flex items-center gap-1.5">
                          <Link2 className="w-4 h-4 text-fx-green" /> Finish-to-Start Dependencies
                        </span>
                      </div>

                      {/* Blocked By (Prerequisites) */}
                      <div>
                        <span className="font-semibold text-fx-text-secondary uppercase tracking-wider text-[11px] block mb-2">
                          Blocked By (Must complete first)
                        </span>
                        {blockedByList.length === 0 ? (
                          <p className="text-fx-text-muted italic">No predecessor prerequisites.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {blockedByList.map((b: any) => (
                              <div
                                key={b.id}
                                className="flex items-center justify-between p-2 rounded bg-fx-bg border border-fx-border"
                              >
                                <div
                                  className="flex items-center gap-2 cursor-pointer"
                                  onClick={() => onSelectTask && onSelectTask(b.predecessorTask.id)}
                                >
                                  <span className="font-mono font-semibold text-fx-green">
                                    {b.predecessorTask.humanId}
                                  </span>
                                  <span className="font-medium text-fx-text-primary">
                                    {b.predecessorTask.title}
                                  </span>
                                  <StatusPill status={b.predecessorTask.status} size="xs" />
                                </div>
                                {isManager && (
                                  <button
                                    onClick={() => removeDependencyMutation.mutate(b.id)}
                                    className="p-1 text-fx-text-muted hover:text-red-600 rounded"
                                    title="Remove dependency"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Dependency Selector (Managers Only) */}
                        {isManager && (
                          <div className="mt-3 flex items-center gap-2">
                            <select
                              value={selectedDepTaskId}
                              onChange={(e) => setSelectedDepTaskId(e.target.value)}
                              className="flex-1 bg-white border border-fx-border rounded px-2 py-1 text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
                            >
                              <option value="">+ Add Prerequisite Dependency...</option>
                              {projectTasks
                                ?.filter(
                                  (t: any) =>
                                    t.id !== task.id &&
                                    !blockedByList.some((b: any) => b.predecessorTaskId === t.id),
                                )
                                .map((t: any) => (
                                  <option key={t.id} value={t.id}>
                                    {t.humanId} - {t.title} ({t.status})
                                  </option>
                                ))}
                            </select>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={!selectedDepTaskId}
                              onClick={() => addDependencyMutation.mutate(selectedDepTaskId)}
                              isLoading={addDependencyMutation.isPending}
                            >
                              Add
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Blocking (Downstream) */}
                      <div className="pt-2 border-t border-fx-border/60">
                        <span className="font-semibold text-fx-text-secondary uppercase tracking-wider text-[11px] block mb-2">
                          Blocking (Tasks waiting on this)
                        </span>
                        {blockingList.length === 0 ? (
                          <p className="text-fx-text-muted italic">No downstream tasks waiting on this.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {blockingList.map((b: any) => (
                              <div
                                key={b.id}
                                onClick={() => onSelectTask && onSelectTask(b.dependentTask.id)}
                                className="flex items-center justify-between p-2 rounded bg-fx-bg border border-fx-border cursor-pointer hover:bg-gray-100"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-semibold text-fx-green">
                                    {b.dependentTask.humanId}
                                  </span>
                                  <span className="font-medium text-fx-text-primary">
                                    {b.dependentTask.title}
                                  </span>
                                </div>
                                <StatusPill status={b.dependentTask.status} size="xs" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtasks */}
                    <div className="p-4 rounded-lg border border-fx-border bg-white space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-fx-text-primary flex items-center gap-1.5">
                          <CheckSquare className="w-4 h-4 text-fx-green" /> Subtasks
                        </span>
                        <span className="text-xs text-fx-text-muted font-medium">
                          {task.completedSubtasksCount || 0} / {task.subtasksCount || 0} completed
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {task.subtasks?.map((sub: any) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between p-2 rounded bg-fx-bg border border-fx-border"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={sub.status === TaskStatus.DONE}
                                onChange={(e) =>
                                  api
                                    .patch(`/tasks/${sub.id}`, {
                                      status: e.target.checked ? TaskStatus.DONE : TaskStatus.TODO,
                                    })
                                    .then(() => queryClient.invalidateQueries({ queryKey: ['task', taskId] }))
                                }
                                className="rounded text-fx-green focus:ring-fx-green"
                              />
                              <span
                                className={cn(
                                  'font-medium text-fx-text-primary',
                                  sub.status === TaskStatus.DONE && 'line-through text-fx-text-muted',
                                  'cursor-pointer',
                                )}
                                onClick={() => onSelectTask && onSelectTask(sub.id)}
                              >
                                {sub.title}
                              </span>
                            </div>
                            <StatusPill status={sub.status} size="xs" />
                          </div>
                        ))}
                      </div>

                      {isManager && (
                        <div className="flex items-center gap-2 pt-1">
                          <Input
                            placeholder="New subtask..."
                            value={newSubtaskTitle}
                            onChange={(e) => setNewSubtaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newSubtaskTitle.trim()) {
                                createSubtaskMutation.mutate(newSubtaskTitle);
                              }
                            }}
                            className="h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={!newSubtaskTitle.trim()}
                            onClick={() => createSubtaskMutation.mutate(newSubtaskTitle)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab: Comments */}
                {activeTab === 'comments' && (
                  <div className="space-y-4 text-xs">
                    <div className="space-y-3">
                      {task.comments?.length === 0 ? (
                        <p className="text-center p-6 text-fx-text-muted">No discussion comments yet.</p>
                      ) : (
                        task.comments?.map((c: any) => (
                          <div key={c.id} className="p-3 rounded-lg bg-fx-bg border border-fx-border space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Avatar
                                  src={c.author?.avatarUrl}
                                  firstName={c.author?.firstName}
                                  lastName={c.author?.lastName}
                                  size="xs"
                                />
                                <span className="font-semibold text-fx-text-primary">
                                  {c.author?.firstName} {c.author?.lastName}
                                </span>
                              </div>
                              <span className="text-[11px] text-fx-text-muted">
                                {formatTimeAgo(c.createdAt)}
                              </span>
                            </div>
                            <p className="text-fx-text-primary whitespace-pre-wrap pl-7">{c.content}</p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2">
                      <textarea
                        rows={3}
                        placeholder="Write a comment... (use @name to mention team members)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full p-3 rounded-md border border-fx-border bg-white text-xs text-fx-text-primary focus:outline-none focus:border-fx-green"
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={!newComment.trim()}
                          onClick={() => addCommentMutation.mutate(newComment)}
                          isLoading={addCommentMutation.isPending}
                        >
                          <Send className="w-3.5 h-3.5 mr-1" /> Post Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Files */}
                {activeTab === 'files' && (
                  <div className="space-y-4 text-xs">
                    <div className="border-2 border-dashed border-fx-border rounded-lg p-6 text-center hover:border-fx-green/60 fx-transition">
                      <Upload className="w-6 h-6 text-fx-text-muted mx-auto mb-2" />
                      <p className="font-semibold text-fx-text-primary">Upload attachments</p>
                      <p className="text-fx-text-muted text-[11px] mt-0.5">Images, 3D builds, documents, PDFs up to 25MB</p>
                      <label className="mt-3 inline-block">
                        <span className="cursor-pointer bg-white border border-fx-border px-3 py-1.5 rounded font-medium text-xs hover:bg-gray-50">
                          Browse File
                        </span>
                        <input type="file" onChange={handleFileUpload} className="hidden" />
                      </label>
                    </div>

                    <div className="space-y-2">
                      {task.attachments?.map((att: any) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-3 rounded-md border border-fx-border bg-white"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Paperclip className="w-4 h-4 text-fx-text-muted shrink-0" />
                            <div className="truncate">
                              <p className="font-medium text-fx-text-primary truncate">{att.fileName}</p>
                              <span className="text-[11px] text-fx-text-muted">
                                {(att.fileSize / 1024).toFixed(1)} KB • Uploaded by {att.uploader?.firstName}
                              </span>
                            </div>
                          </div>
                          <a
                            href={att.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-fx-green hover:underline font-semibold text-xs ml-2 shrink-0"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab: Activity History */}
                {activeTab === 'activity' && (
                  <div className="space-y-3 text-xs">
                    {task.activities?.map((act: any) => (
                      <div key={act.id} className="flex items-start gap-2.5 pb-2 border-b border-fx-border/50">
                        <Avatar
                          src={act.user?.avatarUrl}
                          firstName={act.user?.firstName}
                          lastName={act.user?.lastName}
                          size="xs"
                        />
                        <div className="flex-1">
                          <p className="text-fx-text-primary">
                            <span className="font-semibold">{act.user?.firstName} {act.user?.lastName}</span>{' '}
                            {act.description}
                          </p>
                          <span className="text-[11px] text-fx-text-muted">
                            {formatTimeAgo(act.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
