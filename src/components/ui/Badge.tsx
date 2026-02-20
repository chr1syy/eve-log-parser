import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'default' | 'cyan' | 'gold' | 'red' | 'green';
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-[#1a2540] text-text-secondary border border-border',
  cyan:    'bg-[#00d4ff15] text-cyan-glow border border-[#00d4ff40]',
  gold:    'bg-[#c9a22715] text-gold-bright border border-[#c9a22740]',
  red:     'bg-[#e53e3e15] text-status-kill border border-[#e53e3e40]',
  green:   'bg-[#38a16915] text-status-safe border border-[#38a16940]',
};

export default function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs uppercase tracking-wider font-mono rounded-sm px-2 py-0.5',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
