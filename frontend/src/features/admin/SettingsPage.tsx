'use client';

import React from 'react';
import { Settings, Shield, Server, CheckCircle2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';

export function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-fx-text-primary">
            Workspace Settings
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            System configuration, authentication policies, and core service status.
          </p>
        </div>

        {/* Studio Organization Info */}
        <div className="bg-white border border-fx-border rounded-xl p-5 space-y-3 shadow-none">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-fx-text-primary">

            FutureX Organization Details
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-fx-border/60">
              <span className="text-fx-text-muted">Studio Name</span>
              <span className="font-semibold text-fx-text-primary">FutureX Games Pvt Ltd</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-fx-border/60">
              <span className="text-fx-text-muted">Primary Domain</span>
              <span className="font-mono text-fx-text-secondary">futurex.io</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-fx-text-muted">Core Engine</span>
              <span className="text-fx-green font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Online & Operational
              </span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
