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
    queryFn: () => api.get<Submission[]>(`/tasks/completed-feed?projectId=${encodeURIComponent(projectId)}&search=${encodeURIComponent(debouncedSearch)}`),
    enabled: canManage,
  });

  if (!canManage) {
    return <AppShell><p className="py-10 text-center text-sm text-[#60666F]">Only Admin and Super Admin can view Team Submissions.</p></AppShell>;
  }

  const pending = submissions.filter((task) => task.status === 'IN_REVIEW');
  const completed = submissions.filter((task) => task.status === 'DONE');

  return (
    <AppShell>
      <TaskDetailSlideOver taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />
      <div className="space-y-5">
        <header className="border-b border-[#E8EBEF] pb-4">
          <h1 className="text-xl font-semibold text-[#17191C]">Team Submissions</h1>
          <p className="mt-1 text-xs text-[#60666F]">Completed work across all products and earlier items awaiting review.</p>
        </header>

        <div className="flex flex-wrap gap-2">
          <label className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-md border border-[#E8EBEF] px-3 text-xs">
            <Search className="h-3.5 w-3.5 text-[#8C939E]" />
            <input aria-label="Search submissions" className="min-w-0 flex-1 outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search task, ID or member" />
          </label>
          <select aria-label="Filter by product" className="h-9 rounded-md border border-[#E8EBEF] bg-white px-3 text-xs" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">All products</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </div>

        {error && <p role="alert" className="text-xs text-red-700">{(error as Error).message}</p>}
        {isLoading ? <p className="py-10 text-center text-xs text-[#60666F]">Loading submissions...</p> : (
          <>
            {pending.length > 0 && <section className="space-y-2">
              <h2 className="text-xs font-semibold text-[#17191C]">Earlier submissions awaiting review ({pending.length})</h2>
              {pending.map((task) => <SubmissionRow key={task.id} task={task} onOpen={() => setSelectedTaskId(task.id)} />)}
            </section>}
            <section className="space-y-2">
              <h2 className="text-xs font-semibold text-[#17191C]">Completed ({completed.length})</h2>
              {completed.length ? completed.map((task) => <SubmissionRow key={task.id} task={task} onOpen={() => setSelectedTaskId(task.id)} />) : <p className="py-10 text-center text-xs text-[#8C939E]">No completed tasks match these filters.</p>}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function SubmissionRow({ task, onOpen }: { task: Submission; onOpen: () => void }) {
  return <button type="button" onClick={onOpen} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-[#E8EBEF] bg-white px-3 py-2.5 text-left text-xs hover:border-[#2463EB]">
    <span className="font-mono text-[#60666F]">{task.humanId}</span>
    <span className="min-w-48 flex-1 font-medium text-[#17191C]">{task.title}</span>
    <span className="text-[#60666F]">{task.project.name}</span>
    <span className="text-[#60666F]">{task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : 'Unassigned'}</span>
    <span className="text-[#60666F]">{formatDate(task.completedDate || task.updatedAt)}</span>
    {task.status === 'DONE' ? <CheckCircle2 className="h-4 w-4 text-[#26715A]" /> : <span className="font-medium text-[#7155A5]">Review</span>}
  </button>;
}
