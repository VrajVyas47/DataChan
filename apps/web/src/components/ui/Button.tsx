import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'warning'
  | 'subtle';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    const variantStyles: Record<ButtonVariant, string> = {
      primary: 'bg-primary hover:bg-primary-container text-white shadow-sm hover:shadow',
      secondary: 'bg-secondary hover:bg-secondary-container text-white shadow-sm hover:shadow',
      outline:
        'border border-border bg-transparent text-text hover:bg-surface-high hover:border-text-muted',
      ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-high',
      danger: 'bg-error hover:bg-error/90 text-white shadow-sm',
      warning:
        'bg-warning/15 text-amber-400 border border-warning/30 hover:bg-warning/25 dark:text-amber-300',
      subtle: 'bg-surface-high text-text hover:bg-surface-elevated border border-transparent hover:border-border',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'px-2.5 py-1 text-[11px] rounded-lg gap-1.5',
      sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
      md: 'px-4 py-2 text-xs rounded-xl gap-2',
      lg: 'px-5 py-2.5 text-sm rounded-2xl gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
