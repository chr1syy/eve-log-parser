'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Badge from '@/components/ui/Badge';
import type { LogEntry } from '@/lib/types';

interface DamageOverTimeChartProps {
  entries: LogEntry[];
}

interface MinuteBucket {
  minute: string;
  dealt: number;
  received: number;
}

function bucketByMinute(entries: LogEntry[]): MinuteBucket[] {
  const buckets = new Map<string, { dealt: number; received: number }>();

  for (const entry of entries) {
    if (entry.eventType !== 'damage-dealt' && entry.eventType !== 'damage-received') continue;
    if (!entry.amount) continue;

    const d = entry.timestamp;
    const key = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const bucket = buckets.get(key) ?? { dealt: 0, received: 0 };
    if (entry.eventType === 'damage-dealt') {
      bucket.dealt += entry.amount;
    } else {
      bucket.received += entry.amount;
    }
    buckets.set(key, bucket);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([minute, data]) => ({ minute, ...data }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-overlay border border-[#00d4ff40] px-3 py-2 rounded-sm font-mono text-xs backdrop-blur">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (item: any) => (
          <p key={item.dataKey} style={{ color: item.color }}>
            {item.name}: {item.value.toLocaleString()}
          </p>
        ),
      )}
    </div>
  );
}

export default function DamageOverTimeChart({ entries }: DamageOverTimeChartProps) {
  const data = bucketByMinute(entries);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-text-muted font-mono text-xs">
        NO DAMAGE DATA
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-3">
        <Badge variant="cyan">DEALT</Badge>
        <Badge variant="red">RECEIVED</Badge>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradDealt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradReceived" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#e53e3e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a254060" vertical={false} />
          <XAxis
            dataKey="minute"
            tick={{ fill: '#8892a4', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={{ stroke: '#1a2540' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#8892a4', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="dealt"
            name="Dealt"
            stroke="#00d4ff"
            strokeWidth={2}
            fill="url(#gradDealt)"
            dot={false}
            activeDot={{ r: 3, fill: '#00d4ff' }}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="received"
            name="Received"
            stroke="#e53e3e"
            strokeWidth={2}
            fill="url(#gradReceived)"
            dot={false}
            activeDot={{ r: 3, fill: '#e53e3e' }}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
