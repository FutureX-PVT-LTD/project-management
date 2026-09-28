'use client';

import React from 'react';
import { CheckCircle2, ShieldCheck, Building2, Sliders } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { JobRolePicker } from './JobRolePicker';

export function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 w-full max-w-4xl">
        {/* Header */}
        <div className="border-b border-[#E3E7EC] pb-4">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#181B20]">
            Workspace Settings
          </h1>
          <p className="text-xs text-[#626A73] mt-1">
            System configuration, functional role registry, and organizational identity.
          </p>
        </div>

        {/* Functional Roles Section */}
        <div className="rounded-[10px] border border-[#E3E7EC] bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E3E7EC] pb-3">
            <Sliders className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-[#181B20]">
              Functional Roles & Skills
            </h2>
          </div>
          <JobRolePicker value={[]} onChange={() => undefined} hideSelection />
        </div>

        {/* Organization Information */}
        <div className="rounded-[10px] border border-[#E3E7EC] bg-white p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#E3E7EC] pb-3">
            <Building2 className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-[#181B20]">
              Studio Organization Details
            </h2>
          </div>
          <div className="divide-y divide-[#E3E7EC] text-xs">
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#626A73]">Studio Name</span>
              <span className="font-semibold text-[#181B20]">FutureX Games Pvt Ltd</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#626A73]">Primary Domain</span>
              <span className="font-mono text-[#181B20]">futurex.io</span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#626A73]">Security & Authentication</span>
              <span className="text-[#2563EB] font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Company 2FA & Session Enforced
              </span>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <span className="text-[#626A73]">Core Delivery Engine</span>
              <span className="text-[#237A57] font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Online & Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
