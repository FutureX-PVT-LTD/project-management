import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  } catch {
    return '—';
  }
}

export function formatTimeAgo(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  try {
    const now = Date.now();
    const past = typeof dateInput === 'object' && dateInput instanceof Date ? dateInput.getTime() : new Date(dateInput).getTime();
    if (isNaN(past)) return '';
    const diffSec = Math.floor((now - past) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return formatDate(dateInput);
  } catch {
    return '';
  }
}

export function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.[0] || '';
  const l = lastName?.[0] || '';
  return (f + l).toUpperCase() || 'FX';
}

export function formatProjectKey(key?: string | null, name?: string | null): string {
  if (!key) {
    if (!name) return 'PRJ';
    return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 4) || 'PRJ';
  }
  const cleaned = key.replace(/['"`\\]/g, '').trim().toUpperCase();
  if (cleaned.length > 0) return cleaned;
  if (!name) return 'PRJ';
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 4) || 'PRJ';
}

export function formatTaskId(humanId?: string | null, projectKey?: string | null, projectName?: string | null): string {
  if (!humanId) return 'TASK';
  const parts = humanId.split('-');
  if (parts.length >= 2) {
    const rawPrefix = parts[0].replace(/['"`\\]/g, '').trim().toUpperCase();
    const num = parts.slice(1).join('-');
    const safePrefix = rawPrefix.length > 0 ? rawPrefix : formatProjectKey(projectKey, projectName);
    return `${safePrefix}-${num}`;
  }
  return humanId.replace(/['"`\\]/g, '').trim() || 'TASK';
}

