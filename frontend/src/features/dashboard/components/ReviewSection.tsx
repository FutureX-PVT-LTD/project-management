'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { formatTaskId, formatTimeAgo } from '@/lib/utils';
import { StatusPill } from '@/components/ui/StatusPill';

interface ReviewSectionProps {
  tasks: any[];
  onSelectTask: (id: string) => void;
}

export function ReviewSection({ tasks, onSelectTask }: ReviewSectionProps) {
  if (tasks.length === 0) return null;

  return (
    <section className="space-y-2" aria-labelledby="in-review-heading">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8ECF1]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6D52A3]" />
          <h2 id="in-review-heading" className="text-sm font-semibold uppercase tracking-wider text-[#17191C]">
            In Review ({tasks.length})
          </h2>
        </div>
        <Link
          href="/my-work?tab=REVIEW"
          className="text-xs font-medium text-[#2463EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
        >
          <span>View review items</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-[#E8ECF1]">
        {tasks.map((task) => {
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

          const submittedTime = task.dailyUpdates?.[0]?.createdAt || task.updatedAt;

          return (
            <div
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className="py-3 hover:bg-[#F8FAFC] -mx-2 px-2 rounded-[6px] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs cursor-pointer group"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-semibold text-[#60666F] px-1.5 py-0.5 bg-[#F4F6F8] rounded-[4px] border border-[#E8ECF1]">
                    {cleanId}
                  </span>
                  <span className="font-medium text-sm text-[#17191C] group-hover:text-[#2463EB] truncate transition-colors">
                    {task.title}
                  </span>
                </div>

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
                      <span>{task.checklistPhase}</span>
                    </>
                  )}
                  <span className="text-[#8B929B]">·</span>
                  <span className="text-[#6D52A3] flex items-center gap-1 font-medium">
                    <Clock className="w-3 h-3" />
                    Submitted {submittedTime ? formatTimeAgo(submittedTime) : 'recently'} · Waiting for Admin review
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                <StatusPill status={task.status} size="xs" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
