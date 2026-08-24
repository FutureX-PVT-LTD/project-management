'use client';

import React from 'react';
import { Settings, Server, Database, Shield, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AppShell } from '@/components/layout/AppShell';

export function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-fx-border pb-4">
          <h1 className="text-2xl font-bold text-fx-text-primary tracking-tight">
            Portal & Workspace Settings
          </h1>
          <p className="text-xs sm:text-sm text-fx-text-secondary mt-0.5">
            FutureX Project Hub enterprise configuration and environment status.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Organization details */}
          <Card padding="md" className="bg-white space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-fx-green-700 text-white flex items-center justify-center font-bold text-xs shadow-subtle">
                FX
              </div>
              <h2 className="text-sm font-semibold text-fx-text-primary">Studio Information</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-fx-text-muted block">Organization Name</span>
                <span className="font-semibold text-fx-text-primary mt-0.5 block">
                  FutureX (Pvt) Ltd
                </span>
              </div>
              <div>
                <span className="text-fx-text-muted block">Primary Environment</span>
                <span className="font-semibold text-fx-text-primary mt-0.5 block">
                  Production / Internal Portal
                </span>
              </div>
              <div>
                <span className="text-fx-text-muted block">Active Projects</span>
                <span className="font-semibold text-fx-text-primary mt-0.5 block">
                  Colombo Rider, HiddenMe, FutureX Web
                </span>
              </div>
            </div>
          </Card>

          {/* System & Engine Status */}
          <Card padding="md" className="bg-white space-y-4">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-fx-green-700" />
              <h2 className="text-sm font-semibold text-fx-text-primary">Core Engine Status</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-fx-text-secondary">Dependency Automation Engine</span>
                <span className="font-semibold text-fx-green-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-fx-green-700" /> Operational
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-fx-text-secondary">PostgreSQL Relational DB</span>
                <span className="font-semibold text-fx-green-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-fx-green-700" /> Connected
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-fx-text-secondary">WebSocket Real-Time Events</span>
                <span className="font-semibold text-fx-green-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-fx-green-700" /> Active
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-fx-text-secondary">JWT Security & Token Rotation</span>
                <span className="font-semibold text-fx-green-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-fx-green-700" /> Enabled (HTTP-only)
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
