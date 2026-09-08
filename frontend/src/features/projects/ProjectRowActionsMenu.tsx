'use client';

import React from 'react';
import { ExternalLink, Edit3, Users, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ProjectStatus, UserRole } from '@futurex/shared';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';
import { useAuth } from '@/features/auth/AuthContext';

interface ProjectRowActionsMenuProps {
  project: any;
}

export function ProjectRowActionsMenu({ project }: ProjectRowActionsMenuProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isArchived = project?.status === ProjectStatus.ARCHIVED;
  const canDeleteProject = user?.globalRole === UserRole.OWNER;

  const archiveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/projects/${project.id}`, {
        status: isArchived ? ProjectStatus.ACTIVE : ProjectStatus.ARCHIVED,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', project?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${project.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const menuItems: ActionMenuItem[] = [
    {
      label: 'Open Overview',
      icon: <ExternalLink className="w-3.5 h-3.5" />,
      href: `/projects/${project.id}`,
    },
    {
      label: 'Edit Project',
      icon: <Edit3 className="w-3.5 h-3.5" />,
      href: `/projects/${project.id}/edit`,
    },
    {
      label: 'Manage Members',
      icon: <Users className="w-3.5 h-3.5" />,
      href: `/projects/${project.id}/members`,
      dividerAfter: true,
    },
    {
      label: isArchived ? 'Unarchive Project' : 'Archive Project',
      icon: isArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />,
      onClick: () => archiveMutation.mutate(),
      disabled: archiveMutation.isPending,
    },
    ...(canDeleteProject
      ? [
          {
            label: 'Delete Project',
            icon: <Trash2 className="w-3.5 h-3.5" />,
            variant: 'danger' as const,
            onClick: () => {
              const confirmed = window.confirm(
                `Delete "${project.name}"? This removes the project and hides all of its tasks from dashboards.`,
              );
              if (confirmed) {
                deleteMutation.mutate();
              }
            },
            disabled: deleteMutation.isPending,
          },
        ]
      : []),
  ];

  return <ActionMenu items={menuItems} align="end" side="bottom" sideOffset={4} collisionPadding={8} />;
}
