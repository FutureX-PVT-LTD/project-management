'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Plus, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { roleLabel } from '@/lib/role-labels';

type Person = { id: string; firstName: string; lastName: string; jobTitle?: string; projectRoles?: { id: string; name: string }[] };
type WorkItem = { id: string; humanId: string; title: string; phase: string; assigneeId?: string; status: string; progress: number; dueDate?: string };
type Phase = { phaseKey: string; orderIndex: number; defaultAssigneeId?: string | null; memberIds: string[]; taskCount: number; assignedCount: number; unassignedCount: number; tasks: WorkItem[] };
type Workspace = { totalItems: number; assignedItems: number; unassignedItems: number; readyItems: number; waitingItems: number; members: Person[]; phases: Phase[] };

const nameOf = (person?: Person) => (person ? `${person.firstName} ${person.lastName}` : 'Unassigned');
const optionLabel = (person: Person) => `${nameOf(person)} · ${roleLabel(person.projectRoles, 'No project role')}`;

function formatPhaseTitle(index: number, phaseKey: string) {
  return /^\d+\.\s*/.test(phaseKey) ? phaseKey : `${index + 1}. ${phaseKey}`;
}

export function PhaseAssignments({
  projectId,
  workstream,
}: {
  projectId: string;
  workstream: 'development' | 'marketing';
  items?: unknown[];
  members?: unknown[];
}) {
  const cache = useQueryClient();
  const stream = workstream.toUpperCase();
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [additional, setAdditional] = useState<Record<string, string[]>>({});
  const [reassignActive, setReassignActive] = useState<Record<string, boolean>>({});
  const [addingToPhase, setAddingToPhase] = useState<string | null>(null);
  const [phaseFilter, setPhaseFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['assignment-workspace', projectId, stream],
    queryFn: () => api.get<Workspace>(`/projects/${projectId}/assignment-workspace?workstream=${stream}`),
  });

  const memberById = useMemo(() => new Map((data?.members || []).map((member) => [member.id, member])), [data]);
  const valueFor = (phase: Phase) => defaults[phase.phaseKey] ?? phase.defaultAssigneeId ?? '';
  const additionalFor = (phase: Phase) => additional[phase.phaseKey] ?? phase.memberIds.filter((id) => id !== valueFor(phase));
  const changedPhases = (data?.phases || []).filter(
    (phase) =>
      valueFor(phase) !== (phase.defaultAssigneeId || '') ||
      additional[phase.phaseKey] !== undefined ||
      Boolean(reassignActive[phase.phaseKey])
  );

  const apply = useMutation({
    mutationFn: () =>
      api.post(`/projects/${projectId}/phase-assignments/apply`, {
        workstream: stream,
        assignments: changedPhases.map((phase) => ({
          phaseKey: phase.phaseKey,
          defaultAssigneeId: valueFor(phase) || null,
          additionalMemberIds: additionalFor(phase).filter((id) => id !== valueFor(phase)),
          reassignActive: Boolean(reassignActive[phase.phaseKey]),
        })),
      }),
    onSuccess: () => {
      setError('');
      setDefaults({});
      setAdditional({});
      setReassignActive({});
      setSuccess(`${workstream === 'development' ? 'Development' : 'Marketing'} assignments updated.`);
      window.setTimeout(() => setSuccess(''), 2500);
      cache.invalidateQueries({ queryKey: ['assignment-workspace', projectId] });
      cache.invalidateQueries({ queryKey: ['project', projectId] });
      cache.invalidateQueries({ queryKey: ['my-work'] });
    },
    onError: (reason: any) => setError(reason.message || 'Phase assignments could not be saved.'),
  });

  const assignOne = useMutation({
    mutationFn: ({ task, assigneeId }: { task: WorkItem; assigneeId: string }) =>
      api.patch(`/projects/${projectId}/checklist/${task.id}/assignment`, {
        assigneeId: assigneeId || null,
        confirmReassignment: task.status === 'IN_PROGRESS',
        reason: task.assigneeId ? 'Individual checklist override' : undefined,
      }),
    onSuccess: () => {
      setError('');
      cache.invalidateQueries({ queryKey: ['assignment-workspace', projectId] });
      cache.invalidateQueries({ queryKey: ['project', projectId] });
    },
    onError: (reason: any) => setError(reason.message || 'Task assignment could not be updated.'),
  });

  const tasks = useMemo(
    () =>
      (data?.phases || [])
        .flatMap((phase) => phase.tasks)
        .filter(
          (task) =>
            (!phaseFilter || task.phase === phaseFilter) &&
            (!assigneeFilter || task.assigneeId === assigneeFilter) &&
            (!statusFilter || task.status === statusFilter) &&
            (!unassignedOnly || !task.assigneeId)
        ),
    [data, phaseFilter, assigneeFilter, statusFilter, unassignedOnly]
  );
  const statuses = useMemo(
    () => [...new Set((data?.phases || []).flatMap((phase) => phase.tasks.map((task) => task.status)))].sort(),
    [data]
  );

  if (isLoading) return <p className="py-6 text-center text-xs text-[#8B929B]">Loading assignment workspace...</p>;

  const addPhaseMember = (phase: Phase, userId: string) => {
    if (!userId) return;
    setAdditional((state) => ({
      ...state,
      [phase.phaseKey]: [...new Set([...additionalFor(phase), userId])].filter((id) => id !== valueFor(phase)),
    }));
    setAddingToPhase(null);
  };

  return (
    <section className="space-y-4">
      {/* 10. ASSIGN WORK HEADER */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E8EBEF] pb-3">
        <div>
          <h2 className="text-base font-semibold text-[#17191C]">
            Assign {workstream === 'development' ? 'Development' : 'Marketing'} Work
          </h2>
          <p className="mt-0.5 text-xs text-[#60666F]">
            Assign Product Team members to each {workstream === 'development' ? 'Development' : 'Marketing'} phase.
          </p>
          <p className="mt-1.5 text-xs text-[#60666F]">
            {data?.totalItems || 0} items
            <span className="mx-2 text-[#8B929B]">·</span>
            {data?.assignedItems || 0} assigned
            <span className="mx-2 text-[#8B929B]">·</span>
            {data?.unassignedItems || 0} unassigned
          </p>
        </div>
        <div className="flex items-center gap-3">
          {changedPhases.length > 0 && (
            <span className="text-xs text-[#60666F]">
              {changedPhases.length} unsaved change{changedPhases.length === 1 ? '' : 's'}
            </span>
          )}
          <Button
            size="sm"
            loading={apply.isPending}
            disabled={!changedPhases.length}
            onClick={() => apply.mutate()}
          >
            Apply Assignments
          </Button>
        </div>
      </header>

      {error && (
        <p role="alert" className="flex items-center gap-2 border-b border-red-200 pb-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {success && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md border border-emerald-200 bg-white px-4 py-3 text-xs shadow-lg text-emerald-800"
        >
          <Check className="h-4 w-4 text-emerald-700 shrink-0" />
          {success}
        </div>
      )}

      {/* 2 & 3. COMPACT PHASE ASSIGNMENT TABLE */}
      <div className="border-y border-[#E8EBEF]">
        <div className="hidden grid-cols-[minmax(220px,1fr)_minmax(320px,1.6fr)] gap-6 bg-[#FAFBFC] px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#8B929B] md:grid">
          <span>Phase</span>
          <span>Assigned Member</span>
        </div>

        <div className="divide-y divide-[#E8EBEF]">
          {data?.phases.map((phase, index) => {
            const selectedId = valueFor(phase);
            const extraIds = additionalFor(phase).filter((id) => id !== selectedId);
            const defaultChanged = Boolean(phase.defaultAssigneeId && selectedId !== phase.defaultAssigneeId);

            return (
              <div
                key={phase.phaseKey}
                className="grid gap-2 px-3 py-2.5 md:min-h-[64px] md:grid-cols-[minmax(220px,1fr)_minmax(320px,1.6fr)] md:items-center md:gap-6"
              >
                {/* 4. Phase info on max two lines */}
                <div>
                  <h3 className="text-sm font-semibold text-[#17191C]">
                    {formatPhaseTitle(index, phase.phaseKey)}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#8B929B]">
                    {phase.taskCount} tasks · {phase.unassignedCount} unassigned
                  </p>
                </div>

                {/* 5 & 6. Compact inline member controls */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <select
                      aria-label={`${phase.phaseKey} assigned member`}
                      value={selectedId}
                      onChange={(event) =>
                        setDefaults((state) => ({ ...state, [phase.phaseKey]: event.target.value }))
                      }
                      className="h-8 min-w-[210px] max-w-[260px] rounded-md border border-[#E8EBEF] bg-white px-2.5 text-xs text-[#17191C] focus:border-[#2463EB] focus:outline-none"
                    >
                      <option value="">Choose team member</option>
                      {data?.members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {optionLabel(member)}
                        </option>
                      ))}
                    </select>

                    {/* Additional phase members pills */}
                    {extraIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {extraIds.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded border border-[#E8EBEF] bg-white px-2 py-0.5 text-[11px] text-[#17191C]"
                          >
                            {memberById.get(id) ? optionLabel(memberById.get(id)!) : 'Unknown member'}
                            <button
                              type="button"
                              aria-label={`Remove ${nameOf(memberById.get(id))} from ${phase.phaseKey}`}
                              onClick={() =>
                                setAdditional((state) => ({
                                  ...state,
                                  [phase.phaseKey]: extraIds.filter((memberId) => memberId !== id),
                                }))
                              }
                              className="text-[#8B929B] hover:text-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Small secondary + Add member action */}
                    {addingToPhase === phase.phaseKey ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          aria-label={`Add member to ${phase.phaseKey}`}
                          defaultValue=""
                          onChange={(event) => addPhaseMember(phase, event.target.value)}
                          className="h-8 rounded-md border border-[#E8EBEF] bg-white px-2 text-xs text-[#17191C] focus:border-[#2463EB] focus:outline-none"
                        >
                          <option value="">Choose member</option>
                          {data?.members
                            .filter((member) => member.id !== selectedId && !extraIds.includes(member.id))
                            .map((member) => (
                              <option key={member.id} value={member.id}>
                                {optionLabel(member)}
                              </option>
                            ))}
                        </select>
                        <Button size="xs" variant="ghost" onClick={() => setAddingToPhase(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingToPhase(phase.phaseKey)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#2463EB] hover:text-[#1D4ED8]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add member
                      </button>
                    )}
                  </div>

                  {/* Secondary update existing work toggle if default changed */}
                  {defaultChanged && (
                    <div className="flex items-center gap-2 text-[11px] text-[#60666F]">
                      <span className="text-[#8B929B]">Update existing work:</span>
                      <select
                        value={reassignActive[phase.phaseKey] ? 'active' : 'unassigned'}
                        onChange={(event) =>
                          setReassignActive((state) => ({
                            ...state,
                            [phase.phaseKey]: event.target.value === 'active',
                          }))
                        }
                        className="h-6 rounded border border-[#E8EBEF] bg-white px-1.5 text-[11px] text-[#17191C]"
                      >
                        <option value="unassigned">Only currently unassigned work</option>
                        <option value="active">Reassign active incomplete work</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!data?.members.length && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EBEF] bg-[#FAFBFC] px-4 py-5">
            <div>
              <p className="text-sm font-medium text-[#17191C]">Add the Product Team before assigning phases</p>
              <p className="mt-1 text-xs text-[#60666F]">You can add one or more people now and return here to assign their phases.</p>
            </div>
            <Link href={`/projects/${projectId}/members?returnTo=${encodeURIComponent(`/projects/${projectId}/setup`)}`}>
              <Button size="sm" variant="secondary" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                Add Team Members
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* INDIVIDUAL TASK ASSIGNMENTS OVERRIDES SECTION */}
      <section className="space-y-3 pt-2">
        <div>
          <h3 className="text-sm font-semibold text-[#17191C]">Individual Task Assignments</h3>
          <p className="mt-0.5 text-xs text-[#8B929B]">
            Override a single checklist item without changing the rest of its phase.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-y border-[#E8EBEF] py-2.5 text-xs">
          <label className="grid gap-1">
            <span className="text-[#8B929B]">Phase</span>
            <select
              value={phaseFilter}
              onChange={(event) => setPhaseFilter(event.target.value)}
              className="h-8 rounded-md border border-[#E8EBEF] bg-white px-2 text-xs text-[#17191C]"
            >
              <option value="">All phases</option>
              {data?.phases.map((phase) => (
                <option key={phase.phaseKey} value={phase.phaseKey}>
                  {phase.phaseKey}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[#8B929B]">Assignee</span>
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="h-8 rounded-md border border-[#E8EBEF] bg-white px-2 text-xs text-[#17191C]"
            >
              <option value="">All assignees</option>
              {data?.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {optionLabel(member)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[#8B929B]">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-8 rounded-md border border-[#E8EBEF] bg-white px-2 text-xs text-[#17191C]"
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          <label className="flex h-8 items-center gap-2 text-xs text-[#60666F]">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(event) => setUnassignedOnly(event.target.checked)}
              className="rounded border-[#E8EBEF] text-[#2463EB]"
            />
            Unassigned only
          </label>
        </div>

        <div className="hidden overflow-x-auto border-y border-[#E8EBEF] md:block">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-[#FAFBFC] text-[#8B929B]">
              <tr>
                <th className="px-3 py-2 font-semibold uppercase text-[10px]">ID</th>
                <th className="px-3 py-2 font-semibold uppercase text-[10px]">Task</th>
                <th className="px-3 py-2 font-semibold uppercase text-[10px]">Phase</th>
                <th className="px-3 py-2 font-semibold uppercase text-[10px]">Assignee</th>
                <th className="px-3 py-2 font-semibold uppercase text-[10px]">Status</th>
                <th className="px-3 py-2 font-semibold uppercase text-[10px]">Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EBEF] text-[#17191C]">
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  members={data?.members || []}
                  pending={assignOne.isPending}
                  assign={(assigneeId) => {
                    if (
                      task.status === 'IN_PROGRESS' &&
                      !window.confirm(`Reassign ${task.humanId}? Progress and history will be preserved.`)
                    )
                      return;
                    assignOne.mutate({ task, assigneeId });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#E8EBEF] border-y border-[#E8EBEF] md:hidden">
          {tasks.map((task) => (
            <div key={task.id} className="space-y-2.5 py-3">
              <div>
                <span className="font-mono text-[11px] text-[#8B929B]">{task.humanId}</span>
                <h4 className="mt-0.5 text-sm font-medium text-[#17191C]">{task.title}</h4>
                <p className="mt-0.5 text-xs text-[#8B929B]">
                  {task.phase} · {task.status.replace(/_/g, ' ')}
                </p>
              </div>
              <select
                aria-label={`${task.humanId} assignee`}
                value={task.assigneeId || ''}
                disabled={assignOne.isPending || ['IN_REVIEW', 'DONE'].includes(task.status)}
                onChange={(event) => {
                  if (
                    task.status === 'IN_PROGRESS' &&
                    !window.confirm(`Reassign ${task.humanId}? Progress and history will be preserved.`)
                  )
                    return;
                  assignOne.mutate({ task, assigneeId: event.target.value });
                }}
                className="h-8 w-full rounded-md border border-[#E8EBEF] bg-white px-2 text-xs text-[#17191C]"
              >
                <option value="">Unassigned</option>
                {data?.members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {optionLabel(member)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

function TaskRow({
  task,
  members,
  pending,
  assign,
}: {
  task: WorkItem;
  members: Person[];
  pending: boolean;
  assign: (id: string) => void;
}) {
  return (
    <tr className="hover:bg-[#F8F9FB] h-[48px]">
      <td className="px-3 py-2 font-mono text-[11px] text-[#8B929B]">{task.humanId}</td>
      <td className="px-3 py-2 text-[#17191C] font-medium">{task.title}</td>
      <td className="px-3 py-2 text-[#60666F]">{task.phase}</td>
      <td className="px-3 py-2">
        <select
          aria-label={`${task.humanId} assignee`}
          value={task.assigneeId || ''}
          disabled={pending || ['IN_REVIEW', 'DONE'].includes(task.status)}
          onChange={(event) => assign(event.target.value)}
          className="h-8 min-w-44 rounded-md border border-[#E8EBEF] bg-white px-2 text-xs text-[#17191C]"
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {optionLabel(member)}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-[#60666F]">{task.status.replace(/_/g, ' ')}</td>
      <td className="px-3 py-2 text-[#8B929B]">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}</td>
    </tr>
  );
}
