'use client';

import React from 'react';
import { Calendar, Play, ArrowRight, Lock, AlertCircle } from 'lucide-react';
import { formatDate, formatTaskId, cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Button } from '@/components/ui/Button';
import { TaskStatus } from '@futurex/shared';

interface WorkItemRowProps {
  task: any;
  onSelectTask: (id: string) => void;
  onStartTask?: (id: string) => void;
  isStarting?: boolean;
  showStartAction?: boolean;
  showDependencyReason?: boolean;
  dependencyNote?: string;
  isBlocked?: boolean;
  blockReason?: string;
}

export function WorkItemRow({
  task,
  onSelectTask,
  onStartTask,
  isStarting = false,
  showStartAction = false,
  showDependencyReason = false,
  dependencyNote,
  isBlocked = false,
  blockReason,
}: WorkItemRowProps) {
  const now = new Date();
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < now && task.status !== TaskStatus.DONE;
  const cleanId = formatTaskId(
    task.checklistCode || task.humanId,
    task.project?.key,
    task.project?.name,
  );

  const workstreamLabel =
    task.workstream === 'MARKETING'
      ? 'Marketing'
      : task.workstream === 'DEVELOPMENT'
        ? 'Development'
        : task.workstream || '';

  return (
    <div
      onClick={() => onSelectTask(task.id)}
      className="py-3 hover:bg-[#F8FAFC] -mx-2 px-2 rounded-[6px] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer group"
    >
      {/* Task Meta and Title */}
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-semibold text-[#60666F] px-1.5 py-0.5 bg-[#F4F6F8] rounded-[4px] border border-[#E8ECF1]">
            {cleanId}
          </span>
          <span className="font-medium text-sm text-[#17191C] group-hover:text-[#2463EB] truncate transition-colors">
            {task.title}
          </span>
        </div>

        {/* Supporting context: Product · Workstream · Phase */}
        <div className="flex flex-wrap items-center gap-x-2 text-[12px] text-[#60666F]">
          <span className="font-medium text-[#17191C]">{task.project?.name}</span>
          {workstreamLabel && (
            <>
              <span className="text-[#8B929B]">·</span>
              <span>{workstreamLabel}</span>
            </>
          )}
          {task.checklistPhase && (
            <>
              <span className="text-[#8B929B]">·</span>
              <span className="text-[#60666F]">{task.checklistPhase}</span>
            </>
          )}
          {task.dueDate && (
            <>
              <span className="text-[#8B929B]">·</span>
              <span
                className={cn(
                  'font-mono flex items-center gap-1',
                  isOverdue ? 'text-[#B54747] font-semibold' : 'text-[#8B929B]',
                )}
              >
                <Calendar className="w-3 h-3" />
                {isOverdue ? 'Overdue: ' : 'Due '}
                {formatDate(task.dueDate)}
              </span>
            </>
          )}
        </div>

        {/* Blocked notice */}
        {isBlocked && blockReason && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#B54747] pt-0.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">Reason: {blockReason}</span>
          </div>
        )}

        {/* Dependency notice for waiting */}
        {showDependencyReason && dependencyNote && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#9A6515] pt-0.5">
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>Waiting for: <strong className="font-medium text-[#17191C]">{dependencyNote}</strong></span>
          </div>
        )}
      </div>

      {/* Action / Badges */}
      <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
        <PriorityBadge priority={task.priority} compact />
        <StatusPill status={task.status} size="xs" />

        {showStartAction && onStartTask && (
          <Button
            size="xs"
            variant="secondary"
            loading={isStarting}
            onClick={(e) => {
              e.stopPropagation();
              onStartTask(task.id);
            }}
            leftIcon={<Play className="w-3 h-3 text-[#2463EB] fill-[#2463EB]" />}
            className="ml-1"
          >
            Start
          </Button>
        )}
      </div>
    </div>
  );
}
