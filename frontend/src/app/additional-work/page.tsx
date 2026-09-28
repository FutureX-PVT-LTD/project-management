'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/api-client';
import { calendarDateKey } from '@/features/calendar/calendar-date';
import { cn } from '@/lib/utils';

type WorkLog = {
  id: string;
  projectId: string;
  creatorId: string;
  title: string;
  description: string;
  workDate: string;
  minutesSpent: number | null;
  createdAt: string;
  workstream: 'DEVELOPMENT' | 'MARKETING';
  project: { name: string };
  creator: { firstName: string; lastName: string };
};

type MemberProject = {
  id: string;
  name: string;
  members: { userId: string }[];
};

export default function AdditionalWorkPage() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [editing, setEditing] = useState<WorkLog | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const { data: logs = [], isLoading, isError } = useQuery<WorkLog[]>({
    queryKey: ['additional-work', user?.id],
    queryFn: () => api.get('/additional-work'),
    enabled: !!user,
  });

  const { data: projects = [] } = useQuery<MemberProject[]>({
    queryKey: ['projects', user?.id],
    queryFn: () => api.get('/projects'),
    enabled: !!user,
  });

  const eligibleProjects = projects.filter((project) =>
    project.members?.some((member) => member.userId === user?.id),
  );

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      editing
        ? api.patch(`/additional-work/${editing.id}`, body)
        : api.post('/additional-work', body),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['additional-work'] });
      setOpen(false);
      setEditing(null);
    },
    onError: (reason: Error) => setError(reason.message),
  });

  const inputClass =
    'w-full h-10 rounded-[8px] border border-[#E3E7EC] bg-white px-3 text-xs text-[#181B20] placeholder:text-[#929AA3] focus:outline-none focus:border-[#2563EB] transition-colors';
  const textareaClass =
    'w-full rounded-[8px] border border-[#E3E7EC] bg-white p-3 text-xs text-[#181B20] placeholder:text-[#929AA3] focus:outline-none focus:border-[#2563EB] transition-colors resize-y';

  return (
    <AppShell>
      <div className="space-y-6 w-full max-w-5xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E3E7EC] pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#181B20]">
              Additional Work
            </h1>
            <p className="text-xs text-[#626A73] mt-1">
              Log out-of-scope tasks, ad-hoc investigations, or non-checklist effort.
            </p>
          </div>
          {!open && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setEditing(null);
                setOpen(true);
                setError('');
              }}
            >
              Log Additional Work
            </Button>
          )}
        </div>

        {/* Work Log Form */}
        {open && (
          <div className="rounded-[10px] border border-[#E3E7EC] bg-[#F7F8FA] p-5 sm:p-6 transition-all">
            <form
              key={editing?.id || 'new'}
              className="space-y-4 max-w-2xl"
              onSubmit={(event) => {
                event.preventDefault();
                setError('');
                const fields = new FormData(event.currentTarget);
                save.mutate({
                  ...(editing ? {} : { projectId: fields.get('projectId') }),
                  title: fields.get('title'),
                  description: fields.get('description'),
                  workDate: fields.get('workDate'),
                  workstream: fields.get('workstream'),
                  ...(fields.get('minutesSpent')
                    ? { minutesSpent: Number(fields.get('minutesSpent')) }
                    : {}),
                });
              }}
            >
              <div className="flex items-center justify-between border-b border-[#E3E7EC] pb-3">
                <h2 className="text-sm font-semibold text-[#181B20]">
                  {editing ? 'Edit Work Log' : 'New Work Log'}
                </h2>
                <button
                  type="button"
                  aria-label="Close form"
                  title="Close form"
                  onClick={() => {
                    setOpen(false);
                    setEditing(null);
                  }}
                  className="p-1 rounded-[6px] text-[#626A73] hover:text-[#181B20] hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-[8px] border border-[#C24141]/20 bg-[#FDEEEE] px-3 py-2 text-xs text-[#C24141]"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-medium text-[#181B20]">
                  Product
                  <select
                    name="projectId"
                    required
                    disabled={!!editing}
                    defaultValue={editing?.projectId || ''}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      Select product
                    </option>
                    {eligibleProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-1.5 text-xs font-medium text-[#181B20]">
                  Workstream
                  <select
                    name="workstream"
                    required
                    defaultValue={editing?.workstream || 'DEVELOPMENT'}
                    className={inputClass}
                  >
                    <option value="DEVELOPMENT">Development</option>
                    <option value="MARKETING">Marketing</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5 text-xs font-medium text-[#181B20]">
                Title
                <input
                  name="title"
                  required
                  maxLength={200}
                  placeholder="Summary of what was done..."
                  defaultValue={editing?.title}
                  className={inputClass}
                />
              </label>

              <label className="grid gap-1.5 text-xs font-medium text-[#181B20]">
                Work completed
                <textarea
                  name="description"
                  required
                  maxLength={5000}
                  rows={4}
                  placeholder="Details, context, decisions or technical findings..."
                  defaultValue={editing?.description}
                  className={textareaClass}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-1.5 text-xs font-medium text-[#181B20]">
                  Work date
                  <input
                    type="date"
                    name="workDate"
                    required
                    defaultValue={
                      editing?.workDate.slice(0, 10) || calendarDateKey(new Date())
                    }
                    className={inputClass}
                  />
                </label>
                <label className="grid gap-1.5 text-xs font-medium text-[#181B20]">
                  Minutes spent <span className="text-[#929AA3] font-normal">(optional)</span>
                  <input
                    type="number"
                    name="minutesSpent"
                    min={1}
                    max={1440}
                    placeholder="e.g. 90"
                    defaultValue={editing?.minutesSpent || ''}
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={save.isPending}
                >
                  {save.isPending ? 'Saving...' : 'Save Work Log'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Logs List */}
        {isLoading ? (
          <div className="py-12 text-center text-xs text-[#929AA3]">
            Loading work logs...
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="py-12 text-center text-xs text-[#C24141]"
          >
            Unable to load work logs.
          </div>
        ) : !logs.length ? (
          <div className="py-16 text-center space-y-2 max-w-sm mx-auto">
            <Clock className="w-6 h-6 text-[#929AA3] mx-auto" />
            <h3 className="text-sm font-semibold text-[#181B20]">
              No additional work recorded
            </h3>
            <p className="text-xs text-[#626A73]">
              Track out-of-scope changes and ad-hoc investigations here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E3E7EC]">
            {logs.map((log) => (
              <article
                key={log.id}
                className="py-4 hover:bg-[#F7F8FA] -mx-2 px-2.5 rounded-[8px] transition-colors flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-xs text-[#181B20]">
                      {log.title}
                    </span>
                    <span
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border',
                        log.workstream === 'MARKETING'
                          ? 'border-[#2563EB]/20 bg-[#EEF4FF] text-[#2563EB]'
                          : 'border-[#E3E7EC] bg-white text-[#626A73]',
                      )}
                    >
                      {log.workstream === 'MARKETING' ? 'Marketing' : 'Development'}
                    </span>
                  </div>

                  <p className="flex flex-wrap items-center gap-x-2 text-[11px] text-[#626A73]">
                    <span className="font-medium text-[#181B20]">{log.project.name}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-mono text-[#929AA3]">
                      <Calendar className="w-3 h-3" />
                      {log.workDate.slice(0, 10)}
                    </span>
                    {log.minutesSpent && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-[#626A73]">
                          <Clock className="w-3 h-3" />
                          {log.minutesSpent} min
                        </span>
                      </>
                    )}
                  </p>

                  <p className="text-xs text-[#181B20] whitespace-pre-wrap leading-relaxed max-w-3xl">
                    {log.description}
                  </p>

                  <p className="text-[11px] text-[#929AA3]">
                    Logged by {log.creator.firstName} {log.creator.lastName} ·{' '}
                    {new Date(log.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {log.creatorId === user?.id && (
                  <button
                    type="button"
                    aria-label="Edit work log"
                    title="Edit work log"
                    className="p-1.5 rounded-[6px] text-[#626A73] hover:text-[#181B20] hover:bg-white border border-transparent hover:border-[#E3E7EC] transition-colors shrink-0"
                    onClick={() => {
                      setEditing(log);
                      setOpen(true);
                      setError('');
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
