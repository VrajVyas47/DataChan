import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullHeight?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
  };

  return (
    <div
      className={cn(
        'rounded-full border-primary border-t-transparent animate-spin shrink-0',
        sizeMap[size],
        className
      )}
    />
  );
}

export function LoadingState({
  size = 'md',
  text,
  fullHeight = false,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 p-6 text-center',
        fullHeight && 'min-h-[240px] flex-1',
        className
      )}
    >
      <LoadingSpinner size={size} />
      {text && (
        <span className="text-xs font-mono font-medium text-text-muted uppercase tracking-wider">
          {text}
        </span>
      )}
    </div>
  );
}
