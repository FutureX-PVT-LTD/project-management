'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { WorkItemRow } from './WorkItemRow';

interface ReadyNextSectionProps {
  tasks: any[];
  totalReadyCount: number;
  onSelectTask: (id: string) => void;
  onStartTask: (id: string) => void;
  startingTaskId: string | null;
}

export function ReadyNextSection({
  tasks,
  totalReadyCount,
  onSelectTask,
  onStartTask,
  startingTaskId,
}: ReadyNextSectionProps) {
  if (tasks.length === 0) {
    return (
      <section className="space-y-3" aria-labelledby="ready-next-heading">
        <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
          <h2 id="ready-next-heading" className="text-[12px] font-semibold uppercase tracking-wider text-[#626A73]">
            Up Next
          </h2>
        </div>
        <p className="text-[13px] text-[#626A73] py-3">No work is waiting to start.</p>
      </section>
    );
  }

  const laterCount = Math.max(0, totalReadyCount - tasks.length);

  return (
    <section className="space-y-2" aria-labelledby="ready-next-heading">
      <div className="flex items-center justify-between pb-2 border-b border-[#E3E7EC]">
        <h2 id="ready-next-heading" className="text-[12px] font-semibold uppercase tracking-wider text-[#626A73]">
          Up Next ({tasks.length})
        </h2>
        <Link
          href="/my-work?tab=READY"
          className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
        >
          <span>View all work</span>
          {laterCount > 0 && <span className="text-[#626A73]">({laterCount} later)</span>}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-[#F2F4F7]">
        {tasks.map((task) => (
          <WorkItemRow
            key={task.id}
            task={task}
            onSelectTask={onSelectTask}
            onStartTask={onStartTask}
            isStarting={startingTaskId === task.id}
            showStartAction={true}
          />
        ))}
      </div>
    </section>
  );
}
