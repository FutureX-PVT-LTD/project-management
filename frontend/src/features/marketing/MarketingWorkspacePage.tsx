'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Check,
  ListChecks,
  Megaphone,
  Radio,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { UserRole } from '@futurex/shared';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import styles from './MarketingWorkspacePage.module.css';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';
import { cn, formatDate } from '@/lib/utils';
import { roleLabel } from '@/lib/role-labels';
import { useAuth } from '@/features/auth/AuthContext';

type Tab = 'overview' | 'checklist' | 'channels' | 'content' | 'buzz' | 'signoff';
type MarketingProjectRole = { id?: string; code?: string; name?: string; isActive?: boolean };
type MarketingMember = {
  id: string;
  firstName: string;
  lastName: string;
  projectRoles: MarketingProjectRole[];
};

const marketingRoleOrder = ['MARKETING_MANAGER', 'MARKETING_EXECUTIVE', 'MARKETING_COORDINATOR'];

export function MarketingWorkspacePage() {
  const projectId = String(useParams()?.id || '');
  const { user } = useAuth();
  const manager = user?.globalRole === UserRole.ADMIN || user?.globalRole === UserRole.OWNER;
  const client = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState('');
  const [newLaunchDate, setNewLaunchDate] = useState('');
  const [reschedulePreview, setReschedulePreview] = useState<any[] | null>(null);
  const [checklistPhaseFilter, setChecklistPhaseFilter] = useState('');
  const [checklistAssigneeFilter, setChecklistAssigneeFilter] = useState('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}`),
    enabled: !!projectId,
  });
  const project = asRecord(projectData);

  const projectMembers = asArray<any>(project.members)
    .map((member) => ({
      id: member.userId || member.user?.id,
      firstName: member.user?.firstName || member.firstName || '',
      lastName: member.user?.lastName || member.lastName || '',
      globalRole: member.user?.globalRole || member.globalRole,
      projectRoles: member.projectRoles || [],
    }))
    .filter((member) => member.id);

  const currentMember = projectMembers.find((member) => member.id === user?.id);
  const currentRoleCodes = new Set(
    asArray<any>(currentMember?.projectRoles).map((role) => role.code).filter(Boolean),
  );
  const marketingRoleCodes = ['MARKETING_MANAGER', 'MARKETING_EXECUTIVE', 'MARKETING_COORDINATOR'];
  const marketingMembers = projectMembers.filter((member) =>
    member.globalRole === UserRole.TEAM_MEMBER && asArray<any>(member.projectRoles).some((role) => role.isActive !== false && marketingRoleCodes.includes(role.code)),
  );
  const marketingHead = manager || currentRoleCodes.has('MARKETING_MANAGER');
  const marketingOperator =
    marketingHead ||
    currentRoleCodes.has('MARKETING_EXECUTIVE') ||
    currentRoleCodes.has('MARKETING_COORDINATOR');

  const canEditOperationalRow = (row: any) =>
    marketingOperator && !manager && Boolean(row.ownerId) && row.ownerId === user?.id;

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['marketing', projectId, 'summary'],
    queryFn: () => api.get(`/projects/${projectId}/marketing/summary`),
    enabled: !!projectId,
  });
  const summary = asRecord(summaryData);

  const endpoint = tab === 'overview' ? null : tab === 'signoff' ? 'signoff' : tab;
  const { data: rowsData } = useQuery({
    queryKey: ['marketing', projectId, endpoint],
    queryFn: () => api.get(`/projects/${projectId}/marketing/${endpoint}`),
    enabled: !!endpoint && summary.initialized === true,
  });
  const rows = asArray<any>(rowsData);

  const checklistPhases = [...new Set(rows.map((row) => row.checklistPhase).filter(Boolean))] as string[];
  const filteredChecklistRows = rows.filter(
    (row) =>
      (!checklistPhaseFilter || row.checklistPhase === checklistPhaseFilter) &&
      (!checklistAssigneeFilter || row.assigneeId === checklistAssigneeFilter) &&
      (!showUnassignedOnly || !row.assigneeId),
  );
  const assignedChecklistCount = rows.filter((row) => Boolean(row.assigneeId)).length;
  const marketingMemberIds = new Set(marketingMembers.map((member) => member.id));
  const invalidChecklistAssignments = rows.filter(
    (row) => row.assigneeId && !marketingMemberIds.has(row.assigneeId),
  );

  const refresh = () => {
    client.invalidateQueries({ queryKey: ['marketing', projectId] });
    client.invalidateQueries({ queryKey: ['project', projectId] });
  };

  const initialize = useMutation({
    mutationFn: () => api.post(`/projects/${projectId}/marketing/initialize`, {}),
    onSuccess: () => {
      setError('');
      refresh();
    },
    onError: (e: any) => setError(e.message || 'Marketing workspace could not be initialized.'),
  });

  const update = useMutation({
    mutationFn: ({ path, body }: { path: string; body: any }) =>
      api.patch(`/projects/${projectId}/marketing/${path}`, body),
    onSuccess: refresh,
    onError: (e: any) => setError(e.message || 'Marketing record could not be updated.'),
  });

  const assignChecklist = useMutation({
    mutationFn: ({ row, assigneeId }: { row: any; assigneeId: string }) =>
      api.patch(`/projects/${projectId}/checklist/${row.id}/assignment`, {
        assigneeId: assigneeId || null,
        confirmReassignment: row.status === 'IN_PROGRESS',
        reason: row.assigneeId ? 'Marketing assignment updated from Marketing workspace' : undefined,
      }),
    onSuccess: () => {
      setError('');
      refresh();
      client.invalidateQueries({ queryKey: ['assignment-workspace', projectId, 'MARKETING'] });
    },
    onError: (e: any) => setError(e.message || 'Marketing assignment could not be updated.'),
  });

  const previewReschedule = useMutation({
    mutationFn: () =>
      api.get(
        `/projects/${projectId}/marketing/reschedule-preview?targetDate=${encodeURIComponent(newLaunchDate)}`,
      ),
    onSuccess: (result: any) => {
      setError('');
      setReschedulePreview(asArray(result));
    },
    onError: (e: any) => setError(e.message || 'Date changes could not be previewed.'),
  });

  if (isLoading) {
    return (
      <AppShell>
        <p className="py-8 text-sm text-[#626A73]">Loading Marketing workspace...</p>
      </AppShell>
    );
  }

  if (!summary.initialized) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-5 py-8">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1 text-xs text-[#626A73] hover:text-[#2563EB] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Product
          </Link>
          <div className="border-b border-[#E3E7EC] pb-5">
            <h1 className="text-xl font-semibold text-[#181B20]">Marketing & Launch</h1>
            <p className="mt-1 text-sm text-[#626A73]">
              Marketing has not been initialized for {project.name || 'this Product'}.
            </p>
          </div>
          {manager ? (
            <Button
              onClick={() => initialize.mutate()}
              loading={initialize.isPending}
              leftIcon={<Megaphone className="h-4 w-4" />}
            >
              Initialize Marketing Workspace
            </Button>
          ) : (
            <p className="text-sm text-[#626A73]">An Admin must initialize this workspace.</p>
          )}
          {error && <p className="text-sm text-[#C24141]">{error}</p>}
        </div>
      </AppShell>
    );
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Overview', icon: Megaphone },
    { id: 'checklist', label: 'Infrastructure', icon: ListChecks },
    ...(marketingOperator
      ? [
          { id: 'channels' as Tab, label: 'Channels', icon: Radio },
          { id: 'content' as Tab, label: 'Content Bank', icon: Check },
          { id: 'buzz' as Tab, label: 'Buzz Calendar', icon: CalendarDays },
        ]
      : []),
    ...(marketingHead ? [{ id: 'signoff' as Tab, label: 'Launch Sign-off', icon: ShieldCheck }] : []),
  ];

  return (
    <AppShell fullWidth>
      <div className={styles.workspace}>
        {/* Workspace Header */}
        <header className="border-b border-[#E3E7EC] pb-4">
          <Link
            href={`/projects/${projectId}`}
            className="flex items-center gap-1 text-xs text-[#626A73] hover:text-[#2563EB] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {project.name || 'Product'}
          </Link>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-[#181B20]">Marketing & Launch</h1>
              <p className="mt-1 text-[13px] text-[#626A73]">
                Infrastructure, channels, content and launch readiness.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {manager && (
                <Link
                  href={`/projects/${projectId}/setup?workstream=marketing&returnTo=${encodeURIComponent(
                    `/projects/${projectId}/marketing`,
                  )}`}
                >
                  <Button size="sm" variant="secondary" leftIcon={<Users className="h-3.5 w-3.5" />}>
                    Manage Marketing Assignments
                  </Button>
                </Link>
              )}
              <span
                className={cn(
                  'text-xs font-semibold px-2.5 py-1 rounded-[6px] border',
                  summary.marketingReadiness === 'READY'
                    ? 'text-[#237A57] bg-[#EDF8F2] border-[#C6E7D2]'
                    : 'text-[#A86B12] bg-[#FFF6E5] border-[#FDE68A]',
                )}
              >
                {summary.marketingReadiness?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
        </header>

        {summary.sourceConfirmationRequired > 0 && (
          <div className="flex gap-2 rounded-[8px] border border-[#FDE68A] bg-[#FFF6E5] p-3 text-xs text-[#A86B12]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              {summary.sourceConfirmationRequired} Marketing checklist rows are marked Needs Source Confirmation.
              They cannot make launch readiness READY until the approved workbook wording is imported.
            </span>
          </div>
        )}

        {manager && marketingMembers.length === 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[#FDE68A] bg-[#FFF6E5] p-3 text-xs text-[#A86B12]">
            <span>
              No Product members have Marketing Head, Marketing Executive, or Marketing Coordinator roles yet. Assign
              Product roles before allocating operational records.
            </span>
            <Link
              href={`/projects/${projectId}/members?returnTo=${encodeURIComponent(
                `/projects/${projectId}/marketing`,
              )}`}
              className="font-semibold text-[#2563EB] hover:underline"
            >
              Edit Product Team
            </Link>
          </div>
        )}

        {error && <p className="text-sm text-[#C24141]">{error}</p>}

        {/* Tab Navigation */}
        <nav className="flex gap-1 overflow-x-auto border-b border-[#E3E7EC] pb-2">
          {tabs.map((item) => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'bg-[#EEF4FF] font-semibold text-[#2563EB]'
                    : 'text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA]',
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#2563EB]' : 'text-[#929AA3]')} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* TAB 1: OVERVIEW */}
        {tab === 'overview' && (
          <div className={styles.overview}>
            <section className="space-y-6">
              <div className={styles.metrics}>
                <Metric label="Infrastructure" value={`${summary.checklist?.progress || 0}%`} />
                <Metric
                  label="Channels Ready"
                  value={`${summary.channels?.ready || 0} / ${summary.channels?.total || 0}`}
                />
                <Metric
                  label="Content Ready"
                  value={`${summary.contentBank?.ready || 0} / ${summary.contentBank?.total || 0}`}
                />
                <Metric label="Buzz Stage" value={summary.buzz?.currentStage || 'Not started'} />
              </div>

              <div>
                <div className="mb-2 flex justify-between text-xs text-[#626A73]">
                  <span>Marketing infrastructure</span>
                  <span className="font-mono text-[#181B20]">
                    {summary.checklist?.completed || 0} / {summary.checklist?.totalApplicable || 0}
                  </span>
                </div>
                <Progress value={summary.checklist?.progress || 0} size="sm" />
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#626A73]">
                <p>{summary.checklist?.unassigned || 0} unassigned items</p>
                <p>{summary.checklist?.blocked || 0} blocked items</p>
                <p>{summary.contentBank?.blocked || 0} blocked assets</p>
              </div>

              <div className="space-y-2.5 pt-2">
                <h3 className="text-xs font-semibold uppercase text-[#626A73] tracking-wider">
                  Marketing Phase Progression
                </h3>
                <div className="divide-y divide-[#E3E7EC] border border-[#E3E7EC] rounded-[10px] bg-white overflow-hidden">
                  {(summary.phases || []).map((phase: any) => (
                    <div
                      key={phase.name}
                      className="flex items-center justify-between p-3 text-xs hover:bg-[#F7F8FA] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {phase.status === 'COMPLETE' ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EDF8F2] text-[#237A57] font-bold text-xs">
                            ✓
                          </span>
                        ) : phase.status === 'IN_PROGRESS' ? (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#EEF4FF] text-[#2563EB] text-xs">
                            ●
                          </span>
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F2F4F7] text-[#929AA3] text-xs">
                            ○
                          </span>
                        )}
                        <span className="font-medium text-[#181B20]">{phase.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {phase.total > 0 && (
                          <span className="text-[11px] text-[#929AA3] font-mono">
                            {phase.completed}/{phase.total} done
                          </span>
                        )}
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-[5px] text-[11px] font-medium border',
                            phase.status === 'COMPLETE'
                              ? 'bg-[#EDF8F2] text-[#237A57] border-[#C6E7D2]'
                              : phase.status === 'IN_PROGRESS'
                              ? 'bg-[#EEF4FF] text-[#2563EB] border-[#BFDBFE]'
                              : 'bg-[#F2F4F7] text-[#626A73] border-[#E3E7EC]',
                          )}
                        >
                          {phase.status === 'COMPLETE'
                            ? 'Complete'
                            : phase.status === 'IN_PROGRESS'
                            ? 'In Progress'
                            : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="space-y-3">
              <h2 className="text-xs font-semibold uppercase text-[#626A73]">Marketing Gates</h2>
              <div className="divide-y divide-[#E3E7EC] border border-[#E3E7EC] rounded-[10px] bg-white overflow-hidden p-3">
                {(summary.gates || []).map((gate: any) => (
                  <div
                    key={gate.code}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs first:pt-0 last:pb-0"
                  >
                    <span className="text-[#181B20] font-medium">{gate.name}</span>
                    {manager && gate.status === 'READY_FOR_REVIEW' ? (
                      <button
                        className="font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                        onClick={() =>
                          update.mutate({
                            path: `gates/${gate.id}`,
                            body: { status: 'APPROVED' },
                          })
                        }
                      >
                        Approve
                      </button>
                    ) : (
                      <span className="text-right text-[#626A73] font-mono text-[11px]">
                        {gate.status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </aside>
          </div>
        )}

        {/* TAB 2: INFRASTRUCTURE CHECKLIST */}
        {tab === 'checklist' && (
          <section className="space-y-4">
            {invalidChecklistAssignments.length > 0 && (
              <div className="flex gap-2 rounded-[8px] border border-[#FDE68A] bg-[#FFF6E5] p-3 text-xs text-[#8A5A0A]">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {invalidChecklistAssignments.length} tasks are assigned to members without an active Marketing role.
                  Reassign them to a Marketing Head, Marketing Executive, or Marketing Coordinator.
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#E3E7EC] bg-[#F7F8FA] px-3.5 py-3 rounded-[8px]">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs">
                <span>
                  <strong className="text-[#181B20]">{rows.length}</strong> tasks
                </span>
                <span>
                  <strong className="text-[#237A57]">{assignedChecklistCount}</strong> assigned
                </span>
                <span>
                  <strong className="text-[#A86B12]">{rows.length - assignedChecklistCount}</strong> unassigned
                </span>
              </div>
              {manager && (
                <Link
                  href={`/projects/${projectId}/setup?workstream=marketing&returnTo=${encodeURIComponent(
                    `/projects/${projectId}/marketing`,
                  )}`}
                >
                  <Button size="sm" leftIcon={<Users className="h-3.5 w-3.5" />}>
                    Assign by Phase
                  </Button>
                </Link>
              )}
            </div>

            <div className="flex flex-wrap items-end gap-3 border-b border-[#E3E7EC] pb-3 text-xs">
              <label className="grid gap-1">
                <span className="text-[#929AA3]">Phase</span>
                <select
                  value={checklistPhaseFilter}
                  onChange={(event) => setChecklistPhaseFilter(event.target.value)}
                  className="h-8 min-w-40 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="">All phases</option>
                  {checklistPhases.map((phase) => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[#929AA3]">Assignee</span>
                <select
                  value={checklistAssigneeFilter}
                  onChange={(event) => setChecklistAssigneeFilter(event.target.value)}
                  className="h-8 min-w-48 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:border-[#2563EB] focus:outline-none"
                >
                  <option value="">All assignees</option>
                  {projectMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName} · {roleLabel(member.projectRoles, 'No project role')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex h-8 items-center gap-2 text-[#626A73]">
                <input
                  type="checkbox"
                  checked={showUnassignedOnly}
                  onChange={(event) => setShowUnassignedOnly(event.target.checked)}
                  className="rounded border-[#E3E7EC] text-[#2563EB]"
                />
                Unassigned only
              </label>
            </div>

            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase text-[#626A73]">
                Individual Task Assignments
              </h2>
              {filteredChecklistRows.length > 0 ? (
                <OperationalTable
                  headers={['ID', 'Task', 'Phase', 'Responsibility', 'Assignee', 'Status', 'Evidence']}
                  rows={filteredChecklistRows.map((row) => [
                    <span key="id" className="font-mono text-[#929AA3]">
                      {row.checklistCode}
                    </span>,
                    <span key="title" className="font-medium text-[#181B20]">
                      {row.title}
                    </span>,
                    row.checklistPhase,
                    String(row.checklistOwnerRole || '').replace(/_/g, ' '),
                    manager ? (
                      <MarketingAssigneeSelect
                        key="assignee"
                        row={row}
                        members={marketingMembers}
                        pending={assignChecklist.isPending}
                        onChange={(assigneeId) => {
                          if (
                            row.status === 'IN_PROGRESS' &&
                            !window.confirm(
                              `Reassign ${row.checklistCode}? Existing progress and assignment history will be preserved.`,
                            )
                          )
                            return;
                          assignChecklist.mutate({ row, assigneeId });
                        }}
                      />
                    ) : row.assignee ? (
                      `${row.assignee.firstName} ${row.assignee.lastName}`
                    ) : (
                      <span className="text-[#929AA3]">Unassigned</span>
                    ),
                    <span key="status" className="font-medium">
                      {marketingStatusLabel(row.status)}
                    </span>,
                    row.checklistEvidenceUrl ? (
                      <a
                        key="evidence"
                        href={row.checklistEvidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#2563EB] hover:underline"
                      >
                        Open
                      </a>
                    ) : (
                      row.checklistNotes || '—'
                    ),
                  ])}
                />
              ) : (
                <p className="py-10 text-center text-xs text-[#929AA3]">No Marketing tasks match these filters.</p>
              )}
            </div>
          </section>
        )}

        {/* TAB 3: CHANNEL REGISTRY */}
        {tab === 'channels' && (
          <OperationalTable
            headers={['Platform', 'Requirement', 'Owner', 'Handle / URL', '2FA', 'Status']}
            rows={rows.map((row) => [
              <span key="platform" className="font-semibold text-[#181B20]">
                {row.platform}
              </span>,
              row.requirement.replace(/_/g, ' '),
              manager ? (
                <OwnerSelect
                  key="owner"
                  value={row.ownerId}
                  members={marketingMembers}
                  pending={update.isPending}
                  onChange={(ownerId) => update.mutate({ path: `channels/${row.id}`, body: { ownerId } })}
                />
              ) : (
                ownerName(row.owner)
              ),
              <span key="url" className="font-mono text-[11px] text-[#626A73]">
                {row.publicUrl || row.handle || 'Not configured'}
              </span>,
              row.twoFactorEnabled ? (
                <span key="2fa" className="text-[#237A57] font-medium">
                  Enabled
                </span>
              ) : (
                <span key="2fa" className="text-[#A86B12]">
                  Not enabled
                </span>
              ),
              canEditOperationalRow(row) ? (
                <SelectStatus
                  key="status"
                  value={row.status}
                  values={['NOT_CREATED', 'IN_PROGRESS', 'READY', 'BLOCKED', 'N_A']}
                  onChange={(status) => update.mutate({ path: `channels/${row.id}`, body: { status } })}
                />
              ) : (
                row.status.replace(/_/g, ' ')
              ),
            ])}
          />
        )}

        {/* TAB 4: CONTENT BANK */}
        {tab === 'content' && (
          <OperationalTable
            headers={['ID', 'Type', 'Stage', 'Owner', 'Asset', 'Post']}
            rows={rows.map((row) => [
              <span key="code" className="font-mono text-[#929AA3]">
                {row.code}
              </span>,
              <span key="type" className="font-medium text-[#181B20]">
                {row.contentType}
              </span>,
              row.stage,
              manager ? (
                <OwnerSelect
                  key="owner"
                  value={row.ownerId}
                  members={marketingMembers}
                  pending={update.isPending}
                  onChange={(ownerId) => update.mutate({ path: `content/${row.id}`, body: { ownerId } })}
                />
              ) : (
                ownerName(row.owner)
              ),
              canEditOperationalRow(row) ? (
                <SelectStatus
                  key="asset"
                  value={row.assetStatus}
                  values={['NOT_STARTED', 'IN_PRODUCTION', 'READY', 'BLOCKED']}
                  onChange={(assetStatus) =>
                    update.mutate({ path: `content/${row.id}`, body: { assetStatus } })
                  }
                />
              ) : (
                row.assetStatus.replace(/_/g, ' ')
              ),
              canEditOperationalRow(row) ? (
                <SelectStatus
                  key="post"
                  value={row.postStatus}
                  values={['NOT_POSTED', 'SCHEDULED', 'POSTED', 'SKIPPED', 'N_A']}
                  onChange={(postStatus) =>
                    update.mutate({ path: `content/${row.id}`, body: { postStatus } })
                  }
                />
              ) : (
                row.postStatus.replace(/_/g, ' ')
              ),
            ])}
          />
        )}

        {/* TAB 5: BUZZ CALENDAR */}
        {tab === 'buzz' && (
          <div className="space-y-4">
            {manager && (
              <div className="space-y-3 border-b border-[#E3E7EC] pb-4">
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid gap-1 text-xs text-[#626A73]">
                    New launch date
                    <input
                      type="date"
                      value={newLaunchDate}
                      onChange={(event) => {
                        setNewLaunchDate(event.target.value);
                        setReschedulePreview(null);
                      }}
                      className="h-9 rounded-[8px] border border-[#E3E7EC] px-2.5 text-xs text-[#181B20] focus:border-[#2563EB] focus:outline-none"
                    />
                  </label>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!newLaunchDate}
                    loading={previewReschedule.isPending}
                    onClick={() => previewReschedule.mutate()}
                  >
                    Preview Changes
                  </Button>
                  {reschedulePreview && (
                    <Button
                      size="sm"
                      disabled={update.isPending}
                      onClick={() =>
                        update.mutate(
                          { path: 'reschedule', body: { targetDate: newLaunchDate } },
                          {
                            onSuccess: () => {
                              setReschedulePreview(null);
                              setNewLaunchDate('');
                            },
                          },
                        )
                      }
                    >
                      Confirm Reschedule
                    </Button>
                  )}
                  <p className="text-xs text-[#929AA3]">
                    Completed windows keep their dates; only unfinished windows move.
                  </p>
                </div>
                {reschedulePreview && (
                  <p className="text-xs text-[#626A73]">
                    {reschedulePreview.length} unfinished window{reschedulePreview.length === 1 ? '' : 's'} will
                    move. New range:{' '}
                    {reschedulePreview.length
                      ? `${formatDate(reschedulePreview[0].startDate)} - ${formatDate(
                          reschedulePreview[reschedulePreview.length - 1].endDate,
                        )}`
                      : 'no date changes'}
                    .
                  </p>
                )}
              </div>
            )}
            <div className="divide-y divide-[#E3E7EC] border border-[#E3E7EC] rounded-[10px] bg-white overflow-hidden">
              {rows.map((row) => (
                <div key={row.id} className={styles.buzzRow}>
                  <strong className="text-[#181B20]">{row.stage}</strong>
                  <span className="text-[#626A73]">{row.objective}</span>
                  {manager ? (
                    <OwnerSelect
                      value={row.ownerId}
                      members={marketingMembers}
                      pending={update.isPending}
                      onChange={(ownerId) => update.mutate({ path: `buzz/${row.id}`, body: { ownerId } })}
                    />
                  ) : (
                    <span>{ownerName(row.owner)}</span>
                  )}
                  <span className="font-mono text-[11px] text-[#626A73]">
                    {formatDate(row.startDate)} - {formatDate(row.endDate)}
                  </span>
                  {canEditOperationalRow(row) ? (
                    <SelectStatus
                      value={row.status}
                      values={['NOT_STARTED', 'IN_PROGRESS', 'DONE', 'BLOCKED']}
                      onChange={(status) => update.mutate({ path: `buzz/${row.id}`, body: { status } })}
                    />
                  ) : (
                    <span>{row.status.replace(/_/g, ' ')}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: SIGN-OFF */}
        {tab === 'signoff' && (
          <OperationalTable
            headers={['Check', 'Requirement', 'Marketing Head', 'PM / Admin', 'Final']}
            rows={rows.map((row) => [
              <span key="name" className="font-semibold text-[#181B20]">
                {row.checkName}
              </span>,
              row.requirement,
              <SelectStatus
                key="marketing"
                value={row.marketingCheck}
                values={['PENDING', 'VERIFIED', 'FIX_REQUIRED', 'N_A']}
                onChange={(marketingCheck) =>
                  update.mutate({ path: `signoff/${row.id}`, body: { marketingCheck } })
                }
              />,
              manager ? (
                <SelectStatus
                  key="pm"
                  value={row.pmCheck}
                  values={['PENDING', 'VERIFIED', 'FIX_REQUIRED', 'N_A']}
                  onChange={(pmCheck) => update.mutate({ path: `signoff/${row.id}`, body: { pmCheck } })}
                />
              ) : (
                row.pmCheck.replace(/_/g, ' ')
              ),
              <span key="final" className="font-semibold font-mono text-[11px]">
                {row.finalStatus.replace(/_/g, ' ')}
              </span>,
            ])}
          />
        )}
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#929AA3]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#181B20]">{value}</p>
    </div>
  );
}

function marketingStatusLabel(status?: string) {
  return (
    ({
      UNASSIGNED: 'Unassigned',
      READY: 'Not Started',
      IN_PROGRESS: 'In Progress',
      IN_REVIEW: 'Ready for Review',
      BLOCKED: 'Blocked',
      DONE: 'Done',
      N_A: 'N/A',
    } as Record<string, string>)[status || ''] || String(status || '').replace(/_/g, ' ')
  );
}

function ownerName(owner?: { firstName?: string; lastName?: string } | null) {
  return owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : 'Unassigned';
}

function SelectStatus({
  value,
  values,
  onChange,
}: {
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-[8px] border border-[#E3E7EC] bg-white px-2 text-xs text-[#181B20] focus:border-[#2563EB] focus:outline-none"
    >
      {values.map((item) => (
        <option key={item} value={item}>
          {item.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}

function OwnerSelect({
  value,
  members,
  pending,
  onChange,
}: {
  value?: string | null;
  members: { id: string; firstName: string; lastName: string; projectRoles: unknown[] }[];
  pending: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label="Operational owner"
      value={value || ''}
      disabled={pending}
      onChange={(event) => onChange(event.target.value)}
      className="h-8 min-w-44 rounded-[8px] border border-[#E3E7EC] bg-white px-2 text-xs text-[#181B20] focus:border-[#2563EB] focus:outline-none disabled:bg-[#F2F4F7]"
    >
      <option value="">Unassigned</option>
      {members.map((member) => (
        <option key={member.id} value={member.id}>
          {member.firstName} {member.lastName} · {roleLabel(member.projectRoles, 'Marketing')}
        </option>
      ))}
    </select>
  );
}

function MarketingAssigneeSelect({
  row,
  members,
  pending,
  onChange,
}: {
  row: any;
  members: MarketingMember[];
  pending: boolean;
  onChange: (value: string) => void;
}) {
  const locked = ['IN_REVIEW', 'DONE'].includes(row.status);
  const mustKeepOwner = ['IN_PROGRESS', 'BLOCKED'].includes(row.status);
  const lockReason =
    row.status === 'DONE' ? 'Completed work cannot be reassigned' : 'Return the review before reassignment';
  const roleMap = new Map<string, MarketingProjectRole>();
  for (const member of members) {
    for (const role of asArray<MarketingProjectRole>(member.projectRoles)) {
      if (
        role.code &&
        marketingRoleOrder.includes(role.code) &&
        role.isActive !== false
      ) {
        roleMap.set(role.code, role);
      }
    }
  }
  const roles = [...roleMap.values()].sort(
    (left, right) => marketingRoleOrder.indexOf(left.code || '') - marketingRoleOrder.indexOf(right.code || ''),
  );
  const currentMember = members.find((member) => member.id === row.assigneeId);
  const currentRole = asArray<MarketingProjectRole>(currentMember?.projectRoles).find(
    (role) => role.code && roleMap.has(role.code),
  );
  const [pendingRoleCode, setPendingRoleCode] = useState('');
  const selectedRoleCode = pendingRoleCode || currentRole?.code || '';
  const roleMembers = selectedRoleCode
    ? members.filter((member) =>
        asArray<MarketingProjectRole>(member.projectRoles).some((role) => role.code === selectedRoleCode),
      )
    : [];

  useEffect(() => setPendingRoleCode(''), [row.assigneeId]);

  const selectRole = (roleCode: string) => {
    if (!roleCode) {
      setPendingRoleCode('');
      onChange('');
      return;
    }
    const candidates = members.filter((member) =>
      asArray<MarketingProjectRole>(member.projectRoles).some((role) => role.code === roleCode),
    );
    if (candidates.length === 1) {
      setPendingRoleCode('');
      onChange(candidates[0].id);
      return;
    }
    setPendingRoleCode(roleCode);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <select
        aria-label={`${row.checklistCode} role`}
        value={selectedRoleCode}
        disabled={pending || locked}
        title={locked ? lockReason : 'Assign by Marketing role'}
        onChange={(event) => selectRole(event.target.value)}
        className="h-8 min-w-40 rounded-[8px] border border-[#E3E7EC] bg-white px-2 text-xs text-[#181B20] focus:border-[#2563EB] focus:outline-none disabled:bg-[#F2F4F7] disabled:text-[#929AA3]"
      >
        <option value="" disabled={mustKeepOwner}>
          {row.assigneeId && !currentRole ? 'Select valid role' : 'Unassigned'}
        </option>
        {roles.map((role) => (
          <option key={role.code} value={role.code}>
            {role.name || String(role.code).replace(/_/g, ' ')}
          </option>
        ))}
      </select>
      {selectedRoleCode && roleMembers.length > 1 && (
        <select
          aria-label={`${row.checklistCode} member`}
          value={roleMembers.some((member) => member.id === row.assigneeId) ? row.assigneeId : ''}
          disabled={pending || locked}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 min-w-40 rounded-[8px] border border-[#E3E7EC] bg-white px-2 text-xs text-[#181B20] focus:border-[#2563EB] focus:outline-none disabled:bg-[#F2F4F7] disabled:text-[#929AA3]"
        >
          <option value="" disabled>
            Choose member
          </option>
          {roleMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.firstName} {member.lastName}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function OperationalTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr className="bg-[#F7F8FA] text-[#626A73] border-b border-[#E3E7EC]">
            {headers.map((header) => (
              <th key={header} className="px-3.5 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wider">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E3E7EC]">
          {rows.map((cells, index) => (
            <tr key={index} className="hover:bg-[#F7F8FA] transition-colors h-[48px]">
              {cells.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3.5 py-2.5 align-middle text-[#181B20] text-xs">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
