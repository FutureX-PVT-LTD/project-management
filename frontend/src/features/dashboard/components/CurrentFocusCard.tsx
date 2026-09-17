'use client';

import React from 'react';
import { Calendar, Play, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatDate, formatTaskId, cn } from '@/lib/utils';
import { PriorityBadge } from '@/components/ui/PriorityBadge';
import { StatusPill } from '@/components/ui/StatusPill';
import { Progress } from '@/components/ui/Progress';
import { Button } from '@/components/ui/Button';
import { TaskStatus } from '@futurex/shared';

interface CurrentFocusCardProps {
  currentFocus: any | null;
  recommendedNext: any | null;
  onSelectTask: (id: string) => void;
  onStartTask?: (id: string) => void;
  isStarting?: boolean;
}

export function CurrentFocusCard({
  currentFocus,
  recommendedNext,
  onSelectTask,
  onStartTask,
  isStarting = false,
}: CurrentFocusCardProps) {
  const now = new Date();

  // Case 1: Active IN_PROGRESS item (the strongest visual anchor)
  if (currentFocus) {
    const isOverdue =
      currentFocus.dueDate &&
      new Date(currentFocus.dueDate) < now &&
      currentFocus.status !== TaskStatus.DONE;
    const cleanId = formatTaskId(
      currentFocus.checklistCode || currentFocus.humanId,
      currentFocus.project?.key,
      currentFocus.project?.name,
    );
    const workstreamLabel =
      currentFocus.workstream === 'MARKETING'
        ? 'Marketing'
        : currentFocus.workstream === 'DEVELOPMENT'
          ? 'Development'
          : currentFocus.workstream || '';

    return (
      <section aria-labelledby="current-focus-heading">
        <div className="rounded-[14px] bg-white border border-[#E8ECF1] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F4F6F8] pb-3">
            <span
              id="current-focus-heading"
              className="text-[11px] font-semibold uppercase tracking-wider text-[#245EC7] flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-[#2463EB] animate-pulse" />
              Current Focus
            </span>
            <span className="text-xs font-medium text-[#245EC7] bg-[#EEF4FF] px-2 py-0.5 rounded-[4px]">
              In Progress
            </span>
          </div>

          <div
            onClick={() => onSelectTask(currentFocus.id)}
            className="cursor-pointer group space-y-1.5"
          >
            {/* Product · Workstream · Phase */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#60666F]">
              <span className="font-semibold text-[#17191C]">{currentFocus.project?.name}</span>
              {workstreamLabel && (
                <>
                  <span className="text-[#8B929B]">·</span>
                  <span className="font-medium text-[#60666F]">{workstreamLabel}</span>
                </>
              )}
              {currentFocus.checklistPhase && (
                <>
                  <span className="text-[#8B929B]">·</span>
                  <span className="text-[#8B929B]">{currentFocus.checklistPhase}</span>
                </>
              )}
              <span className="font-mono text-[11px] text-[#60666F] px-1.5 py-0.2 bg-[#F4F6F8] rounded-[4px] border border-[#E8ECF1]">
                {cleanId}
              </span>
            </div>

            {/* Task Title */}
            <h2 className="text-lg sm:text-[21px] font-semibold text-[#17191C] group-hover:text-[#2463EB] leading-snug tracking-tight transition-colors">
              {currentFocus.title}
            </h2>

            {currentFocus.description && (
              <p className="text-xs text-[#60666F] line-clamp-2 leading-relaxed max-w-3xl">
                {currentFocus.description}
              </p>
            )}
          </div>

          {/* Progress bar if progress > 0 or development workstream */}
          {currentFocus.workstream !== 'MARKETING' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#60666F] font-medium">Progress</span>
                <span className="font-mono font-semibold text-[#2463EB]">
                  {currentFocus.progress || 0}%
                </span>
              </div>
              <Progress value={currentFocus.progress || 0} showLabel={false} size="sm" />
            </div>
          )}

          {/* Bottom Bar: Metadata & Primary Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E8ECF1]">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#60666F]">
              {currentFocus.dueDate && (
                <span
                  className={cn(
                    'flex items-center gap-1 font-medium font-mono text-xs',
                    isOverdue ? 'text-[#B54747] font-semibold' : 'text-[#60666F]',
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {isOverdue ? 'Overdue: ' : 'Due '}
                  {formatDate(currentFocus.dueDate)}
                </span>
              )}
              <PriorityBadge priority={currentFocus.priority} />
              <StatusPill status={currentFocus.status} size="xs" />
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => onSelectTask(currentFocus.id)}
              rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="w-full sm:w-auto"
            >
              {currentFocus.workstream === 'MARKETING' ? 'Update Status' : 'Update Progress'}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // Case 2: No active IN_PROGRESS item -> Promote Recommended Next
  if (recommendedNext) {
    const cleanId = formatTaskId(
      recommendedNext.checklistCode || recommendedNext.humanId,
      recommendedNext.project?.key,
      recommendedNext.project?.name,
    );
    const workstreamLabel =
      recommendedNext.workstream === 'MARKETING'
        ? 'Marketing'
        : recommendedNext.workstream === 'DEVELOPMENT'
          ? 'Development'
          : recommendedNext.workstream || '';

    return (
      <section aria-labelledby="current-focus-heading">
        <div className="rounded-[14px] bg-[#FFFFFF] border border-[#E8ECF1] p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#F4F6F8] pb-3">
            <span
              id="current-focus-heading"
              className="text-[11px] font-semibold uppercase tracking-wider text-[#60666F] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#8B929B]" />
              Current Focus
            </span>
            <span className="text-xs text-[#60666F]">Nothing in progress</span>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#237A57] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#237A57]" />
              Recommended next:
            </div>

            <div
              onClick={() => onSelectTask(recommendedNext.id)}
              className="cursor-pointer group space-y-1"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#60666F]">
                <span className="font-semibold text-[#17191C]">{recommendedNext.project?.name}</span>
                {workstreamLabel && (
                  <>
                    <span className="text-[#8B929B]">·</span>
                    <span className="font-medium text-[#60666F]">{workstreamLabel}</span>
                  </>
                )}
                {recommendedNext.checklistPhase && (
                  <>
                    <span className="text-[#8B929B]">·</span>
                    <span className="text-[#8B929B]">{recommendedNext.checklistPhase}</span>
                  </>
                )}
                <span className="font-mono text-[11px] text-[#60666F] px-1.5 py-0.2 bg-[#F4F6F8] rounded-[4px] border border-[#E8ECF1]">
                  {cleanId}
                </span>
              </div>

              <h2 className="text-lg sm:text-[20px] font-semibold text-[#17191C] group-hover:text-[#2463EB] leading-snug tracking-tight transition-colors">
                {recommendedNext.title}
              </h2>

              {recommendedNext.description && (
                <p className="text-xs text-[#60666F] line-clamp-2 leading-relaxed">
                  {recommendedNext.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E8ECF1]">
            <div className="flex flex-wrap items-center gap-3 text-xs text-[#60666F]">
              {recommendedNext.dueDate && (
                <span className="flex items-center gap-1 font-mono text-xs text-[#60666F]">
                  <Calendar className="w-3.5 h-3.5" /> Due {formatDate(recommendedNext.dueDate)}
                </span>
              )}
              <PriorityBadge priority={recommendedNext.priority} />
              <StatusPill status={recommendedNext.status} size="xs" />
            </div>

            <div className="flex items-center gap-2">
              {onStartTask && (
                <Button
                  size="sm"
                  variant="primary"
                  loading={isStarting}
                  onClick={() => onStartTask(recommendedNext.id)}
                  leftIcon={<Play className="w-3.5 h-3.5 fill-white text-white" />}
                  className="w-full sm:w-auto"
                >
                  Start Work
                </Button>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onSelectTask(recommendedNext.id)}
                className="w-full sm:w-auto"
              >
                Details
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Case 3: Completely clear (no in progress and no ready work)
  return (
    <section aria-labelledby="current-focus-heading">
      <div className="rounded-[14px] bg-[#FFFFFF] border border-[#E8ECF1] p-6 text-center space-y-2">
        <div className="w-8 h-8 rounded-full bg-[#EFF8F3] text-[#237A57] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <h2 id="current-focus-heading" className="text-sm font-semibold text-[#17191C]">
          You're up to date
        </h2>
        <p className="text-xs text-[#60666F] max-w-sm mx-auto">
          No items are in progress or ready to start right now.
        </p>
      </div>
    </section>
  );
}
