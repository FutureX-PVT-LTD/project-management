'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Search, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { FormPageLayout } from '@/components/layout/FormPageLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ProjectFormPageProps {
  mode: 'create' | 'edit';
}

export function ProjectFormPage({ mode }: ProjectFormPageProps) {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const projectId = params?.id as string | undefined;

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetDate, setTargetDate] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: mode === 'edit' && !!projectId,
  });

  const project = asRecord(projectData);

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'team-members'],
    queryFn: () => api.get('/users?role=TEAM_MEMBER&isActive=true'),
  });

  const employees = useMemo(
    () =>
      asArray<any>(usersData).filter(
        (u) => u.globalRole === UserRole.TEAM_MEMBER && u.isActive !== false,
      ),
    [usersData],
  );

  const filteredEmployees = employees.filter((u) => {
    if (!memberSearch) return true;
    const q = memberSearch.toLowerCase();
    const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
    return fullName.includes(q) || u.email?.toLowerCase().includes(q) || u.jobTitle?.toLowerCase().includes(q);
  });

  useEffect(() => {
    if (mode !== 'edit' || !project?.id) return;
    setKey(project.key || '');
    setName(project.name || '');
    setDescription(project.description || '');
    setStartDate(project.startDate ? project.startDate.split('T')[0] : '');
    setTargetDate(project.targetDate ? project.targetDate.split('T')[0] : '');
  }, [mode, project?.id, project.key, project.name, project.description, project.startDate, project.targetDate]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        key: key.toUpperCase().trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        memberIds: selectedMemberIds,
      };

      return mode === 'create'
        ? api.post('/projects', payload)
        : api.patch(`/projects/${projectId}`, {
            name: payload.name,
            description: payload.description,
            startDate: payload.startDate,
            targetDate: payload.targetDate,
          });
    },
    onSuccess: (saved: any) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      if (mode === 'create') {
        router.push(`/projects/${saved.id}?created=1`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
        router.push(`/projects/${projectId}?updated=1`);
      }
    },
    onError: (err: any) => setError(err.message || 'Project could not be saved.'),
  });

  const toggleMember = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || (mode === 'create' && !key.trim())) {
      setError('Project name and key are required.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <AppShell>
      <form id="project-form" onSubmit={handleSubmit}>
        <FormPageLayout
          title={mode === 'create' ? 'Create Project' : 'Edit Project'}
          description={
            mode === 'create'
              ? 'Set up the project workspace, schedule, and team in one clear flow.'
              : 'Update project details without changing the team assignment workflow.'
          }
          breadcrumbs={[
            { label: 'Projects', href: '/projects' },
            ...(mode === 'edit' && projectId ? [{ label: project.name || 'Project', href: `/projects/${projectId}` }] : []),
            { label: mode === 'create' ? 'New Project' : 'Edit' },
          ]}
          footer={
            <>
              <Link href={mode === 'edit' && projectId ? `/projects/${projectId}` : '/projects'}>
                <Button type="button" variant="secondary">Cancel</Button>
              </Link>
              <Button type="submit" loading={saveMutation.isPending}>
                {mode === 'create' ? 'Create Project' : 'Save Project'}
              </Button>
            </>
          }
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
              Project Details
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-fx-text-primary mb-1">Project Key *</label>
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  disabled={mode === 'edit'}
                  maxLength={6}
                  placeholder="BG"
                  className="font-mono uppercase"
                  required={mode === 'create'}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-fx-text-primary mb-1">Project Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bus Game" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-fx-text-primary mb-1">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border border-fx-border bg-white p-3 text-xs text-fx-text-primary focus:border-[#315F7D] focus:outline-none focus:ring-1 focus:ring-[#315F7D]"
                placeholder="Scope, release target, and important production notes."
              />
            </div>
          </section>

          <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
              Schedule
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-fx-text-primary mb-1">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-fx-text-primary mb-1">Target Delivery Date</label>
                <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
              </div>
            </div>
          </section>

          {mode === 'create' && (
            <section className="bg-white border border-fx-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-secondary">
                  Team Members
                </h2>
                <span className="text-[11px] text-fx-text-muted">{selectedMemberIds.length} selected</span>
              </div>

              {selectedMemberIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedMemberIds.map((id) => {
                    const emp = employees.find((u) => u.id === id);
                    if (!emp) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 rounded border border-fx-border bg-fx-bg px-2 py-1 text-[11px]">
                        {emp.firstName} {emp.lastName}
                        <button type="button" onClick={() => toggleMember(id)} className="text-fx-text-muted hover:text-red-700">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fx-text-muted" />
                <input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full rounded-md border border-fx-border bg-white py-2 pl-8 pr-3 text-xs focus:border-[#315F7D] focus:outline-none focus:ring-1 focus:ring-[#315F7D]"
                />
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-fx-border divide-y divide-fx-border/60">
                {usersLoading ? (
                  <p className="p-4 text-center text-xs text-fx-text-muted">Loading team members...</p>
                ) : filteredEmployees.length === 0 ? (
                  <p className="p-4 text-center text-xs text-fx-text-muted">No active team members found.</p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const selected = selectedMemberIds.includes(emp.id);
                    return (
                      <button
                        type="button"
                        key={emp.id}
                        onClick={() => toggleMember(emp.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 p-3 text-left text-xs hover:bg-fx-bg-hover',
                          selected && 'bg-[#EDF4F8]/60',
                        )}
                      >
                        <span>
                          <span className="block font-semibold text-fx-text-primary">
                            {emp.firstName} {emp.lastName}
                          </span>
                          <span className="block text-[11px] text-fx-text-muted">{emp.jobTitle || 'Team Member'}</span>
                        </span>
                        {selected && <Check className="h-4 w-4 text-[#315F7D]" />}
                      </button>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </FormPageLayout>
      </form>
    </AppShell>
  );
}
