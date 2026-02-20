import { ReactNode } from 'react';
import { format } from 'date-fns';
import Badge from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { LogEntry, EventType } from '@/lib/types';

interface KillRowProps {
  entry: LogEntry;
}

function eventBadge(eventType: EventType): ReactNode {
  switch (eventType) {
    case 'damage-dealt':
      return <Badge variant="red">KILL</Badge>;
    case 'damage-received':
      return <Badge variant="green">LOSS</Badge>;
    case 'miss-incoming':
      return <Badge variant="default">MISS</Badge>;
    default:
      return <Badge variant="default">{eventType.toUpperCase()}</Badge>;
  }
}

function borderClass(eventType: EventType): string {
  switch (eventType) {
    case 'damage-dealt':
      return 'border-l-2 border-l-status-kill';
    case 'damage-received':
      return 'border-l-2 border-l-status-safe';
    default:
      return 'border-l-2 border-l-status-neutral';
  }
}

export default function KillRow({ entry }: KillRowProps) {
  const {
    timestamp,
    eventType,
    pilotName,
    corpTicker,
    shipType,
    weapon,
    amount,
  } = entry;

  const isKill = eventType === 'damage-dealt';
  const pilotDisplay = pilotName
    ? corpTicker
      ? <>{pilotName} <span className="text-text-muted">[{corpTicker}]</span></>
      : <>{pilotName}</>
    : <span className="text-text-muted">—</span>;

  return (
    <tr
      className={cn(
        'border-b border-border-subtle hover:bg-elevated transition-colors',
        borderClass(eventType),
      )}
    >
      {/* Timestamp */}
      <td className="px-3 py-2 text-text-muted font-mono text-xs whitespace-nowrap">
        {format(timestamp, 'HH:mm:ss')}
      </td>

      {/* Event type badge */}
      <td className="px-3 py-2">
        {eventBadge(eventType)}
      </td>

      {/* Pilot name */}
      <td className={cn(
        'px-3 py-2 font-mono text-xs',
        isKill ? 'text-cyan-glow' : 'text-text-primary',
      )}>
        {pilotDisplay}
      </td>

      {/* Ship type */}
      <td className="px-3 py-2 text-text-secondary font-mono text-xs">
        {shipType ?? '—'}
      </td>

      {/* Weapon */}
      <td className="px-3 py-2 text-text-secondary font-mono text-xs">
        {weapon ?? '—'}
      </td>

      {/* Damage amount */}
      <td className="px-3 py-2 text-gold-bright font-mono text-xs text-right">
        {amount != null ? amount.toLocaleString() : '—'}
      </td>
    </tr>
  );
}
