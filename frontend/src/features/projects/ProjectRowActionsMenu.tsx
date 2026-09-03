'use client';

import React from 'react';
import { ExternalLink, Edit3, Users, Archive, RotateCcw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ProjectStatus } from '@futurex/shared';
import { ActionMenu, ActionMenuItem } from '@/components/ui/ActionMenu';

interface ProjectRowActionsMenuProps {
  project: any;
}

export function ProjectRowActionsMenu({ project }: ProjectRowActionsMenuProps) {
  const queryClient = useQueryClient();

  const isArchived = project?.status === ProjectStatus.ARCHIVED;

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
  ];

  return <ActionMenu items={menuItems} align="end" side="bottom" sideOffset={4} collisionPadding={8} />;
}
