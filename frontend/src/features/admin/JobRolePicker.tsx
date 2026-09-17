'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Archive, RotateCcw } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';
import { UserRole } from '@futurex/shared';

type JobRole = { id: string; code: string; name: string; category: string; isActive: boolean };
export function JobRolePicker({ value, onChange, hideSelection = false }: { value: string[]; onChange: (ids: string[]) => void; hideSelection?: boolean }) {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [manage, setManage] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ENGINEERING');
  const { data: roles = [], error } = useQuery({ queryKey: ['job-roles'], queryFn: () => api.get<JobRole[]>('/users/job-roles') });
  const save = useMutation({ mutationFn: ({ id, ...data }: { id?: string; name?: string; category?: string; isActive?: boolean }) => id ? api.patch(`/users/job-roles/${id}`, data) : api.post('/users/job-roles', data), onSuccess: () => { cache.invalidateQueries({ queryKey: ['job-roles'] }); cache.invalidateQueries({ queryKey: ['users'] }); setName(''); setEditing(null); } });
  return <fieldset className="space-y-3 text-xs">
    <legend className="font-medium">Functional Roles {hideSelection ? '' : '(required for Team Members)'}</legend>
    {!hideSelection && <p className="text-[11px] text-gray-500">Used to match this member to Product phases and task assignments. This is separate from their display-only job title.</p>}
    {!hideSelection && <><input aria-label="Search functional roles" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles..." className="h-9 w-full rounded-md border px-3" /><div className="flex flex-wrap gap-3">{roles.filter((role) => (role.isActive || value.includes(role.id)) && `${role.name} ${role.category}`.toLowerCase().includes(search.toLowerCase())).map((role) => <label key={role.id} className="flex items-center gap-2 rounded border px-2 py-1.5"><input type="checkbox" checked={value.includes(role.id)} onChange={(e) => onChange(e.target.checked ? [...value, role.id] : value.filter((id) => id !== role.id))} /><span>{role.name}<span className="ml-1 text-gray-500">{role.category.toLowerCase()}</span>{!role.isActive && ' (Inactive)'}</span></label>)}</div></>}
    {user?.globalRole === UserRole.OWNER && <button type="button" className="text-[#2463EB]" onClick={() => setManage(!manage)}>{manage ? 'Close role settings' : 'Manage functional roles'}</button>}
    {manage && <div className="space-y-2 border-t pt-3">
      <div className="flex flex-wrap gap-2"><input aria-label="Role name" placeholder="Role name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} className="h-9 min-w-48 flex-1 rounded-md border px-3" /><select aria-label="Role category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border px-2">{['MANAGEMENT','ENGINEERING','DESIGN','QUALITY','MARKETING','CONTENT'].map((item) => <option key={item}>{item}</option>)}</select><button type="button" title={editing ? 'Save role name' : 'Add role'} disabled={!name.trim() || save.isPending} onClick={() => save.mutate({ id: editing || undefined, name: name.trim(), category })} className="p-2 text-[#2463EB]">{editing ? <Pencil size={16} /> : <Plus size={16} />}</button></div>
      {roles.map((role) => <div key={role.id} className="flex items-center justify-between gap-2"><span>{role.name} · {role.category}{!role.isActive && ' (Inactive)'}</span><div className="flex"><button type="button" title="Rename role" onClick={() => { setEditing(role.id); setName(role.name); setCategory(role.category); }} className="p-2"><Pencil size={14} /></button><button type="button" title={role.isActive ? 'Deactivate role' : 'Reactivate role'} disabled={save.isPending} onClick={() => save.mutate({ id: role.id, isActive: !role.isActive })} className="p-2">{role.isActive ? <Archive size={14} /> : <RotateCcw size={14} />}</button></div></div>)}
    </div>}
    {(error || save.error) && <p role="alert" className="text-red-700">{(error || save.error)?.message}</p>}
  </fieldset>;
}
