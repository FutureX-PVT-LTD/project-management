'use client';

import React from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardFiltersProps {
  projects: Array<{ id: string; name: string; key: string }>;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  selectedWorkstream: string;
  onSelectWorkstream: (workstream: string) => void;
}

export function DashboardFilters({
  projects,
  selectedProjectId,
  onSelectProject,
  selectedWorkstream,
  onSelectWorkstream,
}: DashboardFiltersProps) {
  const workstreamOptions = [
    { id: 'ALL', label: 'All Work' },
    { id: 'DEVELOPMENT', label: 'Development' },
    { id: 'MARKETING', label: 'Marketing' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-1">
      {/* Product Filter Dropdown */}
      <div className="relative inline-block text-left">
        <label htmlFor="product-filter" className="sr-only">
          Filter by Product
        </label>
        <div className="relative flex items-center">
          <select
            id="product-filter"
            value={selectedProjectId}
            onChange={(e) => onSelectProject(e.target.value)}
            className="appearance-none h-8 pl-3 pr-8 text-xs font-medium text-[#0F172A] bg-white border border-[#E2E8F0] rounded-[8px] hover:border-[#CBD5E1] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 focus:border-[#2563EB] cursor-pointer transition-colors shadow-xs"
          >
            <option value="all">All Products</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#64748B] absolute right-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Workstream Segmented Control */}
      <div
        role="tablist"
        aria-label="Filter by workstream"
        className="inline-flex items-center p-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[8px] self-start sm:self-auto"
      >
        {workstreamOptions.map((opt) => {
          const isActive = selectedWorkstream === opt.id;
          return (
            <button
              key={opt.id}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => onSelectWorkstream(opt.id)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-[6px] transition-all duration-150',
                isActive
                  ? 'bg-white text-[#1D4ED8] font-semibold shadow-xs'
                  : 'text-[#64748B] hover:text-[#0F172A]',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
