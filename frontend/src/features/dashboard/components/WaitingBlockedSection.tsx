'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, AlertCircle, Lock } from 'lucide-react';
import { WorkItemRow } from './WorkItemRow';

interface WaitingBlockedSectionProps {
  blockedTasks: any[];
  waitingTasks: any[];
  onSelectTask: (id: string) => void;
}

export function WaitingBlockedSection({
  blockedTasks,
  waitingTasks,
  onSelectTask,
}: WaitingBlockedSectionProps) {
  if (blockedTasks.length === 0 && waitingTasks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 1. Blocked Work (Shown before ordinary waiting if present) */}
      {blockedTasks.length > 0 && (
        <section className="space-y-2" aria-labelledby="blocked-heading">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C24141]" />
              <h2 id="blocked-heading" className="text-[12px] font-semibold uppercase tracking-wider text-[#C24141]">
                Blocked ({blockedTasks.length})
              </h2>
            </div>
            <Link
              href="/my-work?tab=BLOCKED"
              className="text-[13px] font-medium text-[#C24141] hover:underline flex items-center gap-1"
            >
              <span>View blocked</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#F2F4F7]">
            {blockedTasks.map((task) => (
              <WorkItemRow
                key={task.id}
                task={task}
                onSelectTask={onSelectTask}
                isBlocked={true}
                blockReason={task.manualBlockReason || 'Requires unblocking action'}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. Waiting Work with Dependency Context */}
      {waitingTasks.length > 0 && (
        <section className="space-y-2" aria-labelledby="waiting-heading">
          <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#A86B12]" />
              <h2 id="waiting-heading" className="text-[12px] font-semibold uppercase tracking-wider text-[#626A73]">
                Waiting on Prerequisites ({waitingTasks.length})
              </h2>
            </div>
            <Link
              href="/my-work?tab=WAITING"
              className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
            >
              <span>View all waiting</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-[#F2F4F7]">
            {waitingTasks.map((task) => {
              const predecessor = task.blockedBy?.[0]?.predecessorTask;
              const predName = predecessor
                ? `${predecessor.checklistCode || predecessor.humanId}: ${predecessor.title}${
                    predecessor.assignee
                      ? ` (assigned to ${predecessor.assignee.firstName} ${predecessor.assignee.lastName})`
                      : ''
                  }`
                : 'prerequisite tasks';

              return (
                <WorkItemRow
                  key={task.id}
                  task={task}
                  onSelectTask={onSelectTask}
                  showDependencyReason={true}
                  dependencyNote={predName}
                />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
