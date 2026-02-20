'use client';

import { ReactNode } from 'react';
import CountUp from 'react-countup';
import { cn } from '@/lib/utils';
import Panel from '@/components/ui/Panel';

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'cyan' | 'gold' | 'red' | 'green';
  icon?: ReactNode;
}

const valueColorMap: Record<NonNullable<StatCardProps['variant']>, string> = {
  default: 'text-text-primary',
  cyan: 'text-cyan-glow',
  gold: 'text-gold-bright',
  red: 'text-status-kill',
  green: 'text-status-safe',
};

export default function StatCard({ label, value, subValue, variant = 'default', icon }: StatCardProps) {
  const isNumeric = typeof value === 'number';
  const colorClass = valueColorMap[variant];

  return (
    <Panel className="relative">
      {/* Icon top-right */}
      {icon && (
        <div className="absolute top-3 right-3 text-text-muted" style={{ width: 20, height: 20 }}>
          {icon}
        </div>
      )}

      {/* Label */}
      <p className="text-text-secondary text-xs font-ui uppercase tracking-widest mb-2">{label}</p>

      {/* Value */}
      <p className={cn('text-2xl font-mono font-bold leading-none', colorClass)}>
        {isNumeric ? (
          <CountUp
            end={value as number}
            duration={1.2}
            separator=","
            useEasing
            preserveValue
          />
        ) : (
          value
        )}
      </p>

      {/* SubValue */}
      {subValue && (
        <p className="text-text-muted text-sm font-mono mt-1">{subValue}</p>
      )}
    </Panel>
  );
}
