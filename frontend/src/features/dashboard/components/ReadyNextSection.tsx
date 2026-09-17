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
        <div className="flex items-center justify-between pb-2 border-b border-[#E8ECF1]">
          <h2 id="ready-next-heading" className="text-sm font-semibold uppercase tracking-wider text-[#17191C]">
            Ready Next
          </h2>
        </div>
        <p className="text-xs text-[#8B929B] py-3">Nothing ready right now.</p>
      </section>
    );
  }

  const laterCount = Math.max(0, totalReadyCount - tasks.length);

  return (
    <section className="space-y-2" aria-labelledby="ready-next-heading">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8ECF1]">
        <h2 id="ready-next-heading" className="text-sm font-semibold uppercase tracking-wider text-[#17191C]">
          Ready Next ({tasks.length})
        </h2>
        <Link
          href="/my-work?tab=READY"
          className="text-xs font-medium text-[#2463EB] hover:text-[#1D4ED8] flex items-center gap-1 transition-colors"
        >
          <span>View all work</span>
          {laterCount > 0 && <span className="text-[#8B929B]">({laterCount} later)</span>}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-[#E8ECF1]">
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
