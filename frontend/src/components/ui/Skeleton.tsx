import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-[#F2F4F7] animate-pulseSoft rounded-[6px]', className)}
      {...props}
    />
  );
}

/**
 * Matching skeleton for PM & Owner Dashboards
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-fx-border">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 rounded-[8px]" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-28 rounded-[8px]" />
          <Skeleton className="h-9 w-32 rounded-[8px]" />
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 bg-white border border-fx-border rounded-[12px] space-y-3 shadow-none"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16 rounded-[6px]" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Main Grid: Projects + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="p-5 bg-white border border-fx-border rounded-[14px] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-fx-border">
                  <div className="flex -space-x-1.5">
                    {[...Array(3)].map((_, j) => (
                      <Skeleton key={j} className="h-6 w-6 rounded-full border border-white" />
                    ))}
                  </div>
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attention Feed Side Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="bg-white border border-fx-border rounded-[14px] p-4 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-3 bg-fx-bg-subtle rounded-[10px] space-y-2">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-36" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Matching skeleton for Projects List page
 */
export function ProjectsListSkeleton() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-fx-border">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 rounded-[8px]" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-36 rounded-[10px]" />
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-[8px]" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-52 rounded-[8px]" />
          <Skeleton className="h-9 w-20 rounded-[8px]" />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-5 bg-white border border-fx-border rounded-[14px] space-y-4 shadow-none"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-16 rounded-[4px]" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-fx-border">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Matching skeleton for Project Details Page
 */
export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Project Header */}
      <div className="space-y-4 pb-6 border-b border-fx-border">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-5 w-16 rounded-[6px]" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-72 rounded-[8px]" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-4 border-b border-fx-border pb-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-6 w-20 rounded-[6px]" />
        ))}
      </div>

      {/* Content Area Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-4 bg-white border border-fx-border rounded-[12px] flex items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="bg-white border border-fx-border rounded-[14px] p-5 space-y-4">
            <Skeleton className="h-5 w-32" />
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between items-center">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Matching skeleton for My Work page
 */
export function MyWorkSkeleton() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-fx-border">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36 rounded-[8px]" />
          <Skeleton className="h-4 w-60" />
        </div>
      </div>

      {/* Tabs Strip */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-[8px]" />
        ))}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-9 w-64 rounded-[8px]" />
        <Skeleton className="h-9 w-40 rounded-[8px]" />
        <Skeleton className="h-9 w-36 rounded-[8px]" />
      </div>

      {/* Task Sections */}
      {[...Array(2)].map((_, sectionIdx) => (
        <div key={sectionIdx} className="space-y-3">
          <div className="flex items-center gap-2 pb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="bg-white border border-fx-border rounded-[12px] divide-y divide-fx-border overflow-hidden">
            {[...Array(3)].map((_, rowIdx) => (
              <div key={rowIdx} className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Skeleton className="h-4 w-16 shrink-0" />
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="h-3 w-36" />
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-7 w-20 rounded-[8px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Matching skeleton for Task Detail SlideOver panel
 */
export function TaskDetailSkeleton() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* HumanId & Project Key */}
      <div className="space-y-2 pb-4 border-b border-fx-border">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-20 rounded-[6px]" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-6 w-full max-w-md rounded-[6px]" />
      </div>

      {/* Status Bar */}
      <div className="p-3 bg-fx-bg-subtle rounded-[10px] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-7 w-24 rounded-[8px]" />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-[8px]" />
          </div>

          <div className="space-y-3 pt-3 border-t border-fx-border">
            <Skeleton className="h-4 w-28" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <Skeleton className="h-4 w-4 rounded-[4px]" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Properties Sidebar */}
        <div className="space-y-4 bg-fx-bg-subtle/60 p-4 rounded-[12px] border border-fx-border">
          <Skeleton className="h-4 w-24" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Matching skeleton for Calendar Grid view
 */
export function CalendarSkeleton() {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header controls */}
      <div className="flex items-center justify-between pb-4 border-b border-fx-border">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-36 rounded-[6px]" />
          <div className="flex gap-1">
            <Skeleton className="h-7 w-7 rounded-[6px]" />
            <Skeleton className="h-7 w-7 rounded-[6px]" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-[8px]" />
          <Skeleton className="h-8 w-32 rounded-[8px]" />
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center py-1">
            <Skeleton className="h-3 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* 35 Calendar Day Grid Cells */}
      <div className="grid grid-cols-7 gap-2">
        {[...Array(35)].map((_, i) => (
          <div
            key={i}
            className="h-24 p-2 bg-white border border-fx-border rounded-[8px] space-y-2"
          >
            <Skeleton className="h-3.5 w-5" />
            {i % 3 === 0 && <Skeleton className="h-4 w-full rounded-[4px]" />}
            {i % 5 === 0 && <Skeleton className="h-4 w-3/4 rounded-[4px]" />}
          </div>
        ))}
      </div>
    </div>
  );
}
