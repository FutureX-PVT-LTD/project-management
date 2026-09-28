'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDetailSlideOver } from './TaskDetailSlideOver';
import { api } from '@/lib/api-client';
import { useDebounce } from '@/hooks/useDebounce';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';

type Submission = {
  id: string;
  humanId: string;
  title: string;
  status: string;
  updatedAt: string;
  completedDate: string | null;
  project: { id: string; name: string };
  assignee: { firstName: string; lastName: string } | null;
};

export function TeamSubmissionsPage() {
  const { user } = useAuth();
  const canManage = user?.globalRole === UserRole.ADMIN || user?.globalRole === UserRole.OWNER;
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 250);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Array<{ id: string; name: string }>>('/projects'),
    enabled: canManage,
  });

  const { data: submissions = [], isLoading, error } = useQuery({
    queryKey: ['team-submissions', projectId, debouncedSearch],
    queryFn: () =>
      api.get<Submission[]>(
        `/tasks/completed-feed?projectId=${encodeURIComponent(projectId)}&search=${encodeURIComponent(debouncedSearch)}`,
      ),
    enabled: canManage,
  });

  if (!canManage) {
    return (
      <AppShell>
        <p className="py-10 text-center text-xs text-[#626A73]">
          Only Admin and Super Admin can view Team Submissions.
        </p>
      </AppShell>
    );
  }

  const pending = submissions.filter((task) => task.status === 'IN_REVIEW');
  const completed = submissions.filter((task) => task.status === 'DONE');

  return (
    <AppShell>
      <TaskDetailSlideOver
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
      />
      <div className="space-y-6 w-full max-w-6xl">
        <header className="border-b border-[#E3E7EC] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#181B20]">
            Team Submissions
          </h1>
          <p className="mt-1 text-xs text-[#626A73]">
            Completed work across all products and earlier deliverables awaiting review.
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex h-9 min-w-60 flex-1 items-center gap-2 rounded-[8px] border border-[#E3E7EC] bg-white px-3 text-xs text-[#181B20]">
            <Search className="h-3.5 w-3.5 text-[#929AA3]" />
            <input
              aria-label="Search submissions"
              className="min-w-0 flex-1 outline-none placeholder:text-[#929AA3]"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search task, ID or member..."
            />
          </label>
          <select
            aria-label="Filter by product"
            className="h-9 rounded-[8px] border border-[#E3E7EC] bg-white px-3 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
          >
            <option value="">All products</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="text-xs text-[#C24141]">
            {(error as Error).message}
          </p>
        )}

        {isLoading ? (
          <p className="py-12 text-center text-xs text-[#929AA3]">
            Loading submissions...
          </p>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center gap-2 pb-1.5 border-b border-[#E3E7EC]">
                  <span className="w-2 h-2 rounded-full bg-[#7557B5]" />
                  <h2 className="text-xs font-semibold text-[#181B20]">
                    Earlier submissions awaiting review ({pending.length})
                  </h2>
                </div>
                <div className="divide-y divide-[#E3E7EC] rounded-[8px] border border-[#E3E7EC] bg-white overflow-hidden">
                  {pending.map((task) => (
                    <SubmissionRow
                      key={task.id}
                      task={task}
                      onOpen={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <div className="flex items-center gap-2 pb-1.5 border-b border-[#E3E7EC]">
                <span className="w-2 h-2 rounded-full bg-[#237A57]" />
                <h2 className="text-xs font-semibold text-[#181B20]">
                  Completed ({completed.length})
                </h2>
              </div>
              {completed.length ? (
                <div className="divide-y divide-[#E3E7EC] rounded-[8px] border border-[#E3E7EC] bg-white overflow-hidden">
                  {completed.map((task) => (
                    <SubmissionRow
                      key={task.id}
                      task={task}
                      onOpen={() => setSelectedTaskId(task.id)}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center text-xs text-[#929AA3]">
                  No completed tasks match these filters.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function SubmissionRow({ task, onOpen }: { task: Submission; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left text-xs hover:bg-[#F7F8FA] transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="font-mono text-[11px] text-[#929AA3] shrink-0">
          {task.humanId}
        </span>
        <span className="font-medium text-[#181B20] truncate">
          {task.title}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[#626A73] shrink-0">
        <span className="truncate max-w-[130px]">{task.project.name}</span>
        <span>
          {task.assignee
            ? `${task.assignee.firstName} ${task.assignee.lastName}`
            : 'Unassigned'}
        </span>
        <span className="font-mono text-[#929AA3]">
          {formatDate(task.completedDate || task.updatedAt)}
        </span>
        {task.status === 'DONE' ? (
          <CheckCircle2 className="h-4 w-4 text-[#237A57]" />
        ) : (
          <span className="font-medium text-[11px] text-[#7557B5] bg-[#F4F0FC] px-2 py-0.5 rounded-[4px] border border-[#7557B5]/20">
            Review
          </span>
        )}
      </div>
    </button>
  );
}
