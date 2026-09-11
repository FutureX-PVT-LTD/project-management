'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, CheckCircle2, Code2, Megaphone } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';
import { asArray, asRecord } from '@/lib/api-data';

function checklistPosition(task: any) {
  const codeNumber = Number(String(task.checklistCode || '').match(/(\d+)$/)?.[1]);
  if (Number.isFinite(codeNumber) && codeNumber > 0) return codeNumber;
  const storedOrder = Number(task.checklistOrder);
  return Number.isFinite(storedOrder) && storedOrder > 0 ? storedOrder : Number.MAX_SAFE_INTEGER;
}

export function ProductSetupPage() {
  const projectId = String(useParams()?.id || '');
  const cache = useQueryClient();
  const [developmentMappings, setDevelopmentMappings] = useState<Record<string, string>>({});
  const [marketingMappings, setMarketingMappings] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const { data: projectData } = useQuery({ queryKey: ['project', projectId], queryFn: () => api.get(`/projects/${projectId}`), enabled: !!projectId });
  const project = asRecord(projectData);
  const members = Array.isArray(project.members) ? project.members : [];
  const development = (Array.isArray(project.tasks) ? project.tasks : []).filter((task: any) => task.workType === 'STANDARD_CHECKLIST' && (task.workstream || 'DEVELOPMENT') === 'DEVELOPMENT').sort((a: any, b: any) => checklistPosition(a) - checklistPosition(b));
  const { data: marketingData } = useQuery({ queryKey: ['marketing', projectId, 'checklist'], queryFn: () => api.get(`/projects/${projectId}/marketing/checklist`), enabled: !!projectId });
  const marketing = asArray<any>(marketingData).sort((a, b) => checklistPosition(a) - checklistPosition(b));
  const roles = (items: any[]) => Array.from(new Set(items.map((item) => item.checklistOwnerRole).filter(Boolean))) as string[];
  const developmentRoles = useMemo(() => roles(development), [development]);
  const marketingRoles = useMemo(() => roles(marketing), [marketing]);
  const save = useMutation({ mutationFn: ({ workstream, mappings }: { workstream: 'development' | 'marketing'; mappings: Record<string, string> }) => workstream === 'development' ? api.post(`/projects/${projectId}/development-checklist/bulk-assign`, { mappings }) : api.post(`/projects/${projectId}/marketing/assignments`, { mappings }), onSuccess: (result: any) => { setMessage(`${result.assignedCount || 0} items assigned.`); cache.invalidateQueries({ queryKey: ['project', projectId] }); cache.invalidateQueries({ queryKey: ['marketing', projectId] }); }, onError: (error: any) => setMessage(error.message || 'Assignments could not be saved.') });
  const assignOne = useMutation({ mutationFn: ({ workstream, taskId, assigneeId }: { workstream: string; taskId: string; assigneeId: string }) => workstream === 'MARKETING' ? api.patch(`/projects/${projectId}/marketing/checklist/${taskId}/assignment`, { assigneeId: assigneeId || null }) : api.patch(`/projects/${projectId}/development-checklist/${taskId}/assignment`, { assigneeId: assigneeId || null }), onSuccess: () => { cache.invalidateQueries({ queryKey: ['project', projectId] }); cache.invalidateQueries({ queryKey: ['marketing', projectId] }); } });

  return <AppShell fullWidth><div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E8EBEF] pb-5"><div><p className="text-xs text-[#8B929B]">Product Setup</p><h1 className="mt-1 text-xl font-semibold text-[#17191C]">{project.name || 'Product'} assignments</h1><p className="mt-1 text-[13px] text-[#60666F]">Assign responsibilities in bulk, then override individual work where needed.</p></div><Link href={`/projects/${projectId}`}><Button rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>Go to Product</Button></Link></header>
    {message && <p className="rounded-md border border-[#E8EBEF] bg-[#F8F9FB] px-3 py-2 text-xs">{message}</p>}
    <SetupSection icon={<Code2 className="h-4 w-4" />} title="Development Assignment" items={development} responsibilityRoles={developmentRoles} mappings={developmentMappings} setMappings={setDevelopmentMappings} members={members} onApply={() => save.mutate({ workstream: 'development', mappings: developmentMappings })} onAssign={(taskId: string, assigneeId: string) => assignOne.mutate({ workstream: 'DEVELOPMENT', taskId, assigneeId })} />
    <SetupSection icon={<Megaphone className="h-4 w-4" />} title="Marketing Assignment" items={marketing} responsibilityRoles={marketingRoles} mappings={marketingMappings} setMappings={setMarketingMappings} members={members} onApply={() => save.mutate({ workstream: 'marketing', mappings: marketingMappings })} onAssign={(taskId: string, assigneeId: string) => assignOne.mutate({ workstream: 'MARKETING', taskId, assigneeId })} />
  </div></AppShell>;
}

function SetupSection({ icon, title, items, responsibilityRoles, mappings, setMappings, members, onApply, onAssign }: any) {
  const unassigned = items.filter((item: any) => !item.assigneeId).length;
  return <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8EBEF] pb-2"><div className="flex items-center gap-2"><span className="text-[#2463EB]">{icon}</span><h2 className="text-sm font-semibold">{title}</h2><span className="text-xs text-[#8B929B]">{items.length} items · {unassigned} unassigned</span></div>{unassigned === 0 && items.length > 0 && <span className="flex items-center gap-1 text-xs text-[#237A57]"><CheckCircle2 className="h-3.5 w-3.5" /> Assigned</span>}</div>
    {responsibilityRoles.length > 0 && <div className="flex flex-wrap items-end gap-3">{responsibilityRoles.map((role: string) => <label key={role} className="grid gap-1 text-xs"><span>{role.replace(/_/g, ' ')}</span><select value={mappings[role] || ''} onChange={(e) => setMappings((current: any) => ({ ...current, [role]: e.target.value }))} className="h-8 min-w-44 rounded-md border border-[#E8EBEF] bg-white px-2"><option value="">Choose member</option>{members.map((member: any) => <option key={member.userId} value={member.userId}>{member.user?.firstName} {member.user?.lastName}</option>)}</select></label>)}<Button size="sm" variant="secondary" onClick={onApply}>Apply assignments</Button></div>}
    <div className="overflow-x-auto rounded-lg border border-[#E8EBEF]"><table className="w-full text-left text-xs"><thead><tr className="bg-[#FAFBFC] text-[#60666F]"><th className="px-3 py-2">ID</th><th className="px-3 py-2">Task</th><th className="px-3 py-2">Phase</th><th className="px-3 py-2">Responsibility</th><th className="px-3 py-2">Assignee</th></tr></thead><tbody className="divide-y divide-[#E8EBEF]">{items.map((item: any) => <tr key={item.id}><td className="px-3 py-2 font-mono">{item.checklistCode}</td><td className="max-w-xl px-3 py-2">{item.title}</td><td className="px-3 py-2 text-[#60666F]">{item.checklistPhase}</td><td className="px-3 py-2 text-[#60666F]">{String(item.checklistOwnerRole || '').replace(/_/g, ' ')}</td><td className="px-3 py-2"><select value={item.assigneeId || ''} onChange={(e) => onAssign(item.id, e.target.value)} className="h-8 min-w-40 rounded-md border border-[#E8EBEF] bg-white px-2"><option value="">Unassigned</option>{members.map((member: any) => <option key={member.userId} value={member.userId}>{member.user?.firstName} {member.user?.lastName}</option>)}</select></td></tr>)}</tbody></table></div>
  </section>;
}
