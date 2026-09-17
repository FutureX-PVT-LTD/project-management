'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { ArrowRight, Code2, Megaphone } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api-client';
import { PhaseAssignments } from './PhaseAssignments';
import { asArray, asRecord } from '@/lib/api-data';

function checklistPosition(task: any) {
  const codeNumber = Number(String(task.checklistCode || '').match(/(\d+)$/)?.[1]);
  if (Number.isFinite(codeNumber) && codeNumber > 0) return codeNumber;
  const storedOrder = Number(task.checklistOrder);
  return Number.isFinite(storedOrder) && storedOrder > 0 ? storedOrder : Number.MAX_SAFE_INTEGER;
}

export function ProductSetupPage() {
  const projectId = String(useParams()?.id || '');
  const { data: projectData } = useQuery({ queryKey: ['project', projectId], queryFn: () => api.get(`/projects/${projectId}`), enabled: !!projectId });
  const project = asRecord(projectData);
  const development = (Array.isArray(project.tasks) ? project.tasks : []).filter((task: any) => task.workType === 'STANDARD_CHECKLIST' && (task.workstream || 'DEVELOPMENT') === 'DEVELOPMENT').sort((a: any, b: any) => checklistPosition(a) - checklistPosition(b));
  const { data: marketingData } = useQuery({ queryKey: ['marketing', projectId, 'checklist'], queryFn: () => api.get(`/projects/${projectId}/marketing/checklist`), enabled: !!projectId });
  const marketing = asArray<any>(marketingData).sort((a, b) => checklistPosition(a) - checklistPosition(b));
  return <AppShell fullWidth><div className="space-y-7">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E8EBEF] pb-5"><div><p className="text-xs text-[#8B929B]">Product Setup</p><h1 className="mt-1 text-xl font-semibold text-[#17191C]">{project.name || 'Product'} assignments</h1></div><Link href={`/projects/${projectId}`}><Button rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>Go to Product</Button></Link></header>
    <Tabs.Root defaultValue="development" className="min-w-0">
      <Tabs.List aria-label="Assignment workstream" className="mb-6 flex gap-4 overflow-x-auto border-b border-[#E8EBEF]">
        <Tabs.Trigger value="development" className="flex shrink-0 items-center gap-2 border-b-2 border-transparent px-2 py-3 text-sm text-[#60666F] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2463EB] data-[state=active]:border-[#2463EB] data-[state=active]:text-[#2463EB]">
          <Code2 className="h-4 w-4" /> Development <span className="text-xs tabular-nums">({development.length})</span>
        </Tabs.Trigger>
        <Tabs.Trigger value="marketing" className="flex shrink-0 items-center gap-2 border-b-2 border-transparent px-2 py-3 text-sm text-[#60666F] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2463EB] data-[state=active]:border-[#2463EB] data-[state=active]:text-[#2463EB]">
          <Megaphone className="h-4 w-4" /> Marketing <span className="text-xs tabular-nums">({marketing.length})</span>
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="development" className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[#2463EB]">
        <PhaseAssignments projectId={projectId} workstream="development" />
      </Tabs.Content>
      <Tabs.Content value="marketing" className="min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-[#2463EB]">
        <PhaseAssignments projectId={projectId} workstream="marketing" />
      </Tabs.Content>
    </Tabs.Root>
  </div></AppShell>;
}
