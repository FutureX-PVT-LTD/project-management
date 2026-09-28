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
            className="appearance-none h-8 pl-3 pr-8 text-xs font-medium text-[#181B20] bg-white border border-[#E3E7EC] rounded-[8px] hover:border-[#D4DAE1] focus:outline-none focus:ring-1 focus:ring-[#2563EB] focus:border-[#2563EB] cursor-pointer transition-colors"
          >
            <option value="all">All Products</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#626A73] absolute right-2.5 pointer-events-none" />
        </div>
      </div>

      {/* Workstream Segmented Control */}
      <div
        role="tablist"
        aria-label="Filter by workstream"
        className="inline-flex items-center p-0.5 bg-[#F2F4F7] border border-[#E3E7EC] rounded-[8px] self-start sm:self-auto"
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
                  ? 'bg-white text-[#2563EB] font-semibold border border-[#E3E7EC]'
                  : 'text-[#626A73] hover:text-[#181B20]',
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
