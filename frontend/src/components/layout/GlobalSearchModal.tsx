'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FolderKanban, CheckSquare, User, Flag, X } from 'lucide-react';
import { api } from '@/lib/api-client';
import { StatusPill } from '../ui/StatusPill';
import { PriorityBadge } from '../ui/PriorityBadge';
import { Dialog, DialogContent } from '../ui/Dialog';

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTask?: (taskId: string, projectId: string) => void;
}

export function GlobalSearchModal({ open, onOpenChange, onSelectTask }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    tasks: any[];
    projects: any[];
    users: any[];
    milestones: any[];
  }>({ tasks: [], projects: [], users: [], milestones: [] });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim() || !open) {
      setResults({ tasks: [], projects: [], users: [], milestones: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(res);
      } catch (e) {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open]);

  const handleSelectTask = (taskId: string, projectId: string) => {
    onOpenChange(false);
    if (onSelectTask) {
      onSelectTask(taskId, projectId);
    } else {
      router.push(`/projects/${projectId}?taskId=${taskId}`);
    }
  };

  const handleSelectProject = (projectId: string) => {
    onOpenChange(false);
    router.push(`/projects/${projectId}`);
  };

  const hasResults =
    results.tasks.length > 0 ||
    results.projects.length > 0 ||
    results.users.length > 0 ||
    results.milestones.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border-fx-border">
        <div className="flex items-center px-4 py-3 border-b border-fx-border bg-white">
          <Search className="w-4 h-4 text-fx-text-muted mr-3 shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent text-sm text-fx-text-primary placeholder:text-fx-text-muted focus:outline-none"
            placeholder="Search tasks, projects, milestones, teammates... (CR-101, Colombo...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-fx-text-muted hover:text-fx-text-primary rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4 bg-fx-bg/50">
          {isLoading && (
            <div className="p-6 text-center text-xs text-fx-text-muted">
              Searching FutureX workspace...
            </div>
          )}

          {!isLoading && query && !hasResults && (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-fx-text-secondary">No results found for "{query}"</p>
              <p className="text-xs text-fx-text-muted mt-1">
                Try searching by task ID (e.g. CR-101), project name, or teammate.
              </p>
            </div>
          )}

          {!query && (
            <div className="p-6 text-center text-xs text-fx-text-muted">
              Type keywords or task codes like <span className="font-mono text-fx-green">CR-101</span> to search.
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-fx-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5" /> Tasks ({results.tasks.length})
              </div>
              <div className="mt-1 space-y-1">
                {results.tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleSelectTask(task.id, task.projectId)}
                    className="flex items-center justify-between p-2.5 rounded-md hover:bg-white border border-transparent hover:border-fx-border cursor-pointer fx-transition text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-xs text-fx-green font-semibold shrink-0">
                        {task.humanId}
                      </span>
                      <span className="font-medium text-fx-text-primary truncate">{task.title}</span>
                      <span className="text-xs text-fx-text-muted shrink-0 hidden sm:inline">
                        • {task.projectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <PriorityBadge priority={task.priority} showLabel={false} />
                      <StatusPill status={task.status} size="xs" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-fx-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5" /> Projects ({results.projects.length})
              </div>
              <div className="mt-1 space-y-1">
                {results.projects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleSelectProject(proj.id)}
                    className="flex items-center justify-between p-2.5 rounded-md hover:bg-white border border-transparent hover:border-fx-border cursor-pointer fx-transition text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="h-6 w-6 rounded bg-fx-green-soft text-fx-green font-bold text-xs flex items-center justify-center shrink-0">
                        {proj.key}
                      </span>
                      <span className="font-medium text-fx-text-primary truncate">{proj.name}</span>
                    </div>
                    <span className="text-xs text-fx-text-muted shrink-0">
                      PM: {proj.managerName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {results.users.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-semibold text-fx-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Team Members ({results.users.length})
              </div>
              <div className="mt-1 space-y-1">
                {results.users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between p-2.5 rounded-md bg-white border border-fx-border/60 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-medium text-fx-text-primary">{u.name}</span>
                      <span className="text-xs text-fx-text-muted">({u.jobTitle || u.globalRole})</span>
                    </div>
                    <span className="text-xs text-fx-text-secondary">{u.email}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
