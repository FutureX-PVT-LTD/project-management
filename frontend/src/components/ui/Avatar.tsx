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

  const colors = [
    'bg-[#EEF4F7] text-[#274E68]',
    'bg-[#F8F9FA] text-[#62676D]',
    'bg-[#EDF0F2] text-[#315F7D]',
    'bg-[#EEF4FD] text-[#3974C6]',
    'bg-[#F4F0FB] text-[#7359AA]',
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
          'rounded-full object-cover shrink-0 select-none',
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
