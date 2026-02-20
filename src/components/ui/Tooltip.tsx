'use client';

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Tooltip({ content, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      <span
        className={cn(
          'absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none',
          'bg-overlay border border-border-active text-text-primary text-xs font-mono p-2 rounded-sm',
          'whitespace-nowrap',
          'transition-opacity duration-150',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        {content}
      </span>
    </span>
  );
}
