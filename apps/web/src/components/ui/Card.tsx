import React from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'default' | 'elevated' | 'outline' | 'interactive' | 'surface';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variantStyles: Record<CardVariant, string> = {
    default: 'bg-surface-low border border-border rounded-2xl p-5 shadow-sm',
    surface: 'bg-surface border border-border rounded-2xl p-5 shadow-sm',
    elevated: 'bg-surface-elevated border border-border rounded-2xl p-5 shadow-soft',
    outline: 'bg-transparent border border-border rounded-2xl p-5',
    interactive:
      'bg-surface-low hover:bg-surface-high border border-border hover:border-primary/40 rounded-2xl p-5 transition-all duration-150 cursor-pointer shadow-sm hover:shadow',
  };

  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-1 pb-3', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-sm sm:text-base font-bold text-text leading-tight', className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-text-muted leading-relaxed', className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex-1 flex flex-col', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('pt-3 mt-auto border-t border-border/60 flex items-center justify-between gap-3', className)} {...props}>
      {children}
    </div>
  );
}
