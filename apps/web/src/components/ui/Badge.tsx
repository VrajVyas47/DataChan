import React from 'react';
import { cn } from '@/lib/utils';
import { UserRole } from '@datachan/shared-types';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'info';

export type BadgeSize = 'xs' | 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  role?: UserRole;
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  icon,
  role,
  children,
  ...props
}: BadgeProps) {
  // If role is passed, map it to canonical role style
  let effectiveVariant = variant;
  if (role === 'admin') effectiveVariant = 'warning';
  else if (role === 'faculty') effectiveVariant = 'secondary';
  else if (role === 'student') effectiveVariant = 'success';

  const variantStyles: Record<BadgeVariant, string> = {
    primary: 'bg-primary/15 text-primary border-primary/30',
    secondary: 'bg-purple-500/15 text-purple-400 border-purple-500/30 dark:text-purple-300',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 dark:text-emerald-300',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/30 dark:text-amber-300',
    danger: 'bg-red-500/15 text-red-400 border-red-500/30 dark:text-red-300',
    neutral: 'bg-surface-high text-text-muted border-border',
    info: 'bg-sky-500/15 text-sky-400 border-sky-500/30 dark:text-sky-300',
  };

  const dotStyles: Record<BadgeVariant, string> = {
    primary: 'bg-primary',
    secondary: 'bg-purple-400',
    success: 'bg-emerald-400',
    warning: 'bg-amber-400',
    danger: 'bg-red-400',
    neutral: 'bg-text-muted',
    info: 'bg-sky-400',
  };

  const sizeStyles: Record<BadgeSize, string> = {
    xs: 'text-[9px] px-1.5 py-0.2 rounded-md font-bold tracking-wider uppercase',
    sm: 'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider',
    md: 'text-xs px-2.5 py-1 rounded-full font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border leading-none shrink-0 transition-colors select-none',
        variantStyles[effectiveVariant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full shrink-0 animate-pulse', dotStyles[effectiveVariant])}
        />
      )}
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{role ? role.toUpperCase() : children}</span>
    </span>
  );
}
