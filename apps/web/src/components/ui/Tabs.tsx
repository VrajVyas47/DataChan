'use client';

import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  value: string;
  onValueChange: (val: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('flex flex-col gap-3', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'pill' | 'underline';
}

export function TabList({ children, className, variant = 'pill' }: TabListProps) {
  return (
    <div
      className={cn(
        variant === 'pill'
          ? 'inline-flex items-center gap-1 p-1 rounded-xl bg-surface-low border border-border/80 w-fit'
          : 'flex items-center gap-4 border-b border-border w-full',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface TabTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export function TabTrigger({
  value,
  icon,
  badge,
  children,
  className,
  ...props
}: TabTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabTrigger must be used within a Tabs component');
  }

  const isActive = context.value === value;

  return (
    <button
      type="button"
      onClick={() => context.onValueChange(value)}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 select-none cursor-pointer',
        isActive
          ? 'bg-primary text-white shadow-sm'
          : 'text-text-muted hover:text-text hover:bg-surface-high',
        className
      )}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge && <span className="inline-flex shrink-0 ml-1">{badge}</span>}
    </button>
  );
}

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ value, children, className }: TabContentProps) {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('TabContent must be used within a Tabs component');
  }

  if (context.value !== value) return null;

  return <div className={cn('w-full flex-1', className)}>{children}</div>;
}
