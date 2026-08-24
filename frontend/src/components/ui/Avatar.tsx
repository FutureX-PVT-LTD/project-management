import React from 'react';
import { getInitials, cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name?: string;
  firstName?: string;
  lastName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ src, name, firstName, lastName, size = 'sm', className }: AvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  const displayName = name || `${firstName || ''} ${lastName || ''}`.trim() || 'FX';
  const initials = getInitials(firstName, lastName) || displayName.substring(0, 2).toUpperCase();

  const sizeClasses = {
    xs: 'h-5 w-5 text-[10px]',
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm font-medium',
  };

  // Consistent pleasant background color based on name string
  const colors = [
    'bg-emerald-100 text-emerald-800',
    'bg-blue-100 text-blue-800',
    'bg-amber-100 text-amber-800',
    'bg-teal-100 text-teal-800',
    'bg-slate-200 text-slate-800',
  ];
  const charCode = displayName.charCodeAt(0) || 0;
  const colorClass = colors[charCode % colors.length];

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={displayName}
        onError={() => setImageError(true)}
        className={cn(
          'rounded-full object-cover shrink-0 border border-black/5 select-none',
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold shrink-0 select-none uppercase',
        sizeClasses[size],
        colorClass,
        className,
      )}
      title={displayName}
    >
      {initials}
    </div>
  );
}
