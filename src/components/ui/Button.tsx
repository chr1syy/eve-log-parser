import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  children?: ReactNode;
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'border border-cyan-glow text-cyan-glow hover:bg-cyan-ghost hover:shadow-[0_0_12px_#00d4ff40]',
  secondary:
    'border border-border text-text-secondary hover:border-cyan-dim hover:text-text-primary',
  danger:
    'border border-status-kill text-status-kill hover:bg-[#e53e3e15]',
};

const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1 text-xs gap-1.5',
  md: 'px-4 py-1.5 text-sm gap-2',
  lg: 'px-6 py-2.5 text-base gap-2',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center',
        'font-ui font-semibold uppercase tracking-wider rounded-sm',
        'transition-all duration-150',
        variantStyles[variant],
        sizeStyles[size],
        disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
        className,
      )}
    >
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
