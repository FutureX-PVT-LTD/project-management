'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, X } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api-client';
import { calendarDateKey } from '@/features/calendar/calendar-date';

type WorkLog = {
  id: string; projectId: string; creatorId: string; title: string; description: string;
  workDate: string; minutesSpent: number | null; createdAt: string;
  project: { name: string }; creator: { firstName: string; lastName: string };
};
type MemberProject = { id: string; name: string; members: { userId: string }[] };

export default function AdditionalWorkPage() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const { data: logs = [], isLoading, isError } = useQuery<WorkLog[]>({
    queryKey: ['additional-work', user?.id], queryFn: () => api.get('/additional-work'), enabled: !!user,
  });
  const { data: projects = [] } = useQuery<MemberProject[]>({
    queryKey: ['projects', user?.id], queryFn: () => api.get('/projects'), enabled: !!user,
  });
  const eligibleProjects = projects.filter((project) => project.members?.some((member) => member.userId === user?.id));
  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) => editing
      ? api.patch(`/additional-work/${editing.id}`, body) : api.post('/additional-work', body),
    onSuccess: () => { cache.invalidateQueries({ queryKey: ['additional-work'] }); setOpen(false); setEditing(null); },
    onError: (reason: Error) => setError(reason.message),
  });
  const inputClass = 'w-full rounded border border-fx-border bg-white px-3 py-2 text-sm';
  return <AppShell>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-fx-border pb-4">
      <h1 className="text-xl font-semibold">Additional Work</h1>
      <button type="button" onClick={() => { setEditing(null); setOpen(true); setError(''); }} className="flex items-center gap-2 rounded bg-blue-600 px-3 py-2 text-sm text-white">
        <Plus size={16} /> Log Additional Work
      </button>
    </div>
    {open && <form key={editing?.id || 'new'} className="grid max-w-2xl gap-4 border-b border-fx-border py-5" onSubmit={(event) => {
      event.preventDefault(); setError('');
      const fields = new FormData(event.currentTarget);
      save.mutate({ ...(editing ? {} : { projectId: fields.get('projectId') }), title: fields.get('title'),
        description: fields.get('description'), workDate: fields.get('workDate'),
        ...(fields.get('minutesSpent') ? { minutesSpent: Number(fields.get('minutesSpent')) } : {}),
      });
    }}>
      <div className="flex items-center justify-between"><h2 className="text-base font-semibold">{editing ? 'Edit Work Log' : 'New Work Log'}</h2>
        <button type="button" aria-label="Close form" title="Close form" onClick={() => setOpen(false)}><X size={18} /></button></div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <label className="grid gap-1 text-sm">Project<select name="projectId" required disabled={!!editing} defaultValue={editing?.projectId || ''} className={inputClass}>
        <option value="" disabled>Select project</option>{eligibleProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
      </select></label>
      <label className="grid gap-1 text-sm">Title<input name="title" required maxLength={200} defaultValue={editing?.title} className={inputClass} /></label>
      <label className="grid gap-1 text-sm">Work completed<textarea name="description" required maxLength={5000} rows={3} defaultValue={editing?.description} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Work date<input type="date" name="workDate" required defaultValue={editing?.workDate.slice(0, 10) || calendarDateKey(new Date())} className={inputClass} /></label>
        <label className="grid gap-1 text-sm">Minutes spent (optional)<input type="number" name="minutesSpent" min={1} max={1440} defaultValue={editing?.minutesSpent || ''} className={inputClass} /></label>
      </div>
      <button disabled={save.isPending} className="justify-self-start rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50">{save.isPending ? 'Saving...' : 'Save Work Log'}</button>
    </form>}
    {isLoading ? <p className="py-6 text-sm">Loading work logs...</p> : isError ? <p role="alert" className="py-6 text-sm text-red-700">Unable to load work logs.</p> : !logs.length ? <p className="py-6 text-sm text-fx-text-secondary">No additional work recorded.</p> :
      <div className="divide-y divide-fx-border">{logs.map((log) => <article key={log.id} className="flex gap-4 py-4">
        <div className="min-w-0 flex-1"><h2 className="break-words text-sm font-semibold">{log.title}</h2>
          <p className="mt-1 text-xs text-fx-text-secondary">{log.project.name} · {log.workDate.slice(0, 10)}{log.minutesSpent ? ` · ${log.minutesSpent} min` : ''}</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm">{log.description}</p>
          <p className="mt-2 text-xs text-fx-text-secondary">Logged by {log.creator.firstName} {log.creator.lastName} · {new Date(log.createdAt).toLocaleString()}</p>
        </div>
        {log.creatorId === user?.id && <button type="button" aria-label="Edit work log" title="Edit work log" className="h-8 w-8 shrink-0" onClick={() => { setEditing(log); setOpen(true); setError(''); }}><Pencil size={16} /></button>}
      </article>)}</div>}
  </AppShell>;
}
