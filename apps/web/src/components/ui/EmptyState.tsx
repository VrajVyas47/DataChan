import React from 'react';
import { cn } from '@/lib/utils';
import { FolderOpen } from 'lucide-react';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = <FolderOpen className="w-6 h-6" />,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'w-full flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-surface-low/30',
        className
      )}
      {...props}
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-high border border-border flex items-center justify-center text-text-muted mb-3 shadow-sm">
        {icon}
      </div>
      <h4 className="text-sm font-bold text-text mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-text-muted max-w-sm leading-relaxed mb-4">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
