'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';
import { cn } from '@/lib/utils';

type JobRole = {
  id: string;
  code: string;
  name: string;
  category: string;
  isActive: boolean;
};

export function JobRolePicker({
  value,
  onChange,
  hideSelection = false,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  hideSelection?: boolean;
}) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [manage, setManage] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ENGINEERING');

  const { data: roles = [], error } = useQuery({
    queryKey: ['job-roles'],
    queryFn: () => api.get<JobRole[]>('/users/job-roles'),
  });

  const save = useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id?: string;
      name?: string;
      category?: string;
      isActive?: boolean;
    }) =>
      id
        ? api.patch(`/users/job-roles/${id}`, data)
        : api.post('/users/job-roles', data),
    onSuccess: () => {
      cache.invalidateQueries({ queryKey: ['job-roles'] });
      cache.invalidateQueries({ queryKey: ['users'] });
      setName('');
      setEditing(null);
    },
  });

  return (
    <fieldset className="space-y-3 text-xs">
      <legend className="font-semibold text-[#181B20]">
        Functional Roles {hideSelection ? '' : '(required for Team Members)'}
      </legend>
      {!hideSelection && (
        <p className="text-[11px] text-[#626A73]">
          Used to match this member to Product phases and task assignments. This is separate from their display-only job title.
        </p>
      )}

      {!hideSelection && (
        <>
          <input
            aria-label="Search functional roles"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles..."
            className="h-8.5 w-full rounded-[8px] border border-[#E3E7EC] bg-white px-3 text-xs text-[#181B20] placeholder:text-[#929AA3] focus:outline-none focus:border-[#2563EB]"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {roles
              .filter(
                (role) =>
                  (role.isActive || value.includes(role.id)) &&
                  `${role.name} ${role.category}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
              )
              .map((role) => (
                <label
                  key={role.id}
                  className={cn(
                    'flex items-center gap-2 rounded-[8px] border px-2.5 py-1.5 cursor-pointer transition-colors',
                    value.includes(role.id)
                      ? 'border-[#2563EB] bg-[#EEF4FF] text-[#2563EB]'
                      : 'border-[#E3E7EC] bg-white text-[#181B20] hover:bg-[#F7F8FA]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(role.id)}
                    onChange={(e) =>
                      onChange(
                        e.target.checked
                          ? [...value, role.id]
                          : value.filter((id) => id !== role.id),
                      )
                    }
                    className="rounded border-[#E3E7EC] text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  <span>
                    {role.name}
                    <span className="ml-1 text-[#929AA3] text-[10px]">
                      ({role.category.toLowerCase()})
                    </span>
                    {!role.isActive && (
                      <span className="ml-1 text-[#C24141] text-[10px]">(Inactive)</span>
                    )}
                  </span>
                </label>
              ))}
          </div>
        </>
      )}

      {user?.globalRole === UserRole.OWNER && (
        <button
          type="button"
          className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
          onClick={() => setManage(!manage)}
        >
          {manage ? 'Hide role administration' : 'Configure functional role definitions'}
        </button>
      )}

      {manage && (
        <div className="space-y-3 rounded-[8px] border border-[#E3E7EC] bg-[#F7F8FA] p-4 mt-2">
          <div className="flex flex-wrap gap-2">
            <input
              aria-label="Role name"
              placeholder="New role name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8.5 min-w-48 flex-1 rounded-[8px] border border-[#E3E7EC] bg-white px-3 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
            />
            <select
              aria-label="Role category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8.5 rounded-[8px] border border-[#E3E7EC] bg-white px-2.5 text-xs text-[#181B20] focus:outline-none focus:border-[#2563EB]"
            >
              {[
                'MANAGEMENT',
                'ENGINEERING',
                'DESIGN',
                'QUALITY',
                'MARKETING',
                'CONTENT',
              ].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              title={editing ? 'Save role name' : 'Add role'}
              disabled={!name.trim() || save.isPending}
              onClick={() =>
                save.mutate({
                  id: editing || undefined,
                  name: name.trim(),
                  category,
                })
              }
              className="p-2 rounded-[8px] bg-[#2563EB] text-white hover:bg-[#1D4ED8] disabled:opacity-40 transition-colors"
            >
              {editing ? <Pencil size={15} /> : <Plus size={15} />}
            </button>
          </div>

          <div className="divide-y divide-[#E3E7EC] bg-white rounded-[8px] border border-[#E3E7EC] overflow-hidden">
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <span className={cn(!role.isActive && 'text-[#929AA3]')}>
                  {role.name}{' '}
                  <span className="text-[10px] text-[#929AA3]">
                    · {role.category}
                  </span>
                  {!role.isActive && ' (Inactive)'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Rename role"
                    onClick={() => {
                      setEditing(role.id);
                      setName(role.name);
                      setCategory(role.category);
                    }}
                    className="p-1.5 rounded text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA]"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    title={role.isActive ? 'Deactivate role' : 'Reactivate role'}
                    disabled={save.isPending}
                    onClick={() =>
                      save.mutate({
                        id: role.id,
                        isActive: !role.isActive,
                      })
                    }
                    className="p-1.5 rounded text-[#626A73] hover:text-[#181B20] hover:bg-[#F7F8FA]"
                  >
                    {role.isActive ? <Archive size={13} /> : <RotateCcw size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(error || save.error) && (
        <p role="alert" className="text-xs text-[#C24141]">
          {(error || save.error)?.message}
        </p>
      )}
    </fieldset>
  );
}
