'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Upload } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import Panel from '@/components/ui/Panel';
import Button from '@/components/ui/Button';
import KillRow from '@/components/kills/KillRow';
import { useParsedLogs } from '@/hooks/useParsedLogs';
import type { EventType, LogEntry, ParsedLog } from '@/lib/types';
import { cn } from '@/lib/utils';

type FilterMode = 'all' | 'kills' | 'losses' | 'misses';

const FILTER_EVENT_TYPES: Record<FilterMode, EventType[]> = {
  all: ['damage-dealt', 'damage-received', 'miss-incoming', 'miss-outgoing'],
  kills: ['damage-dealt', 'miss-outgoing'],
  losses: ['damage-received'],
  misses: ['miss-incoming', 'miss-outgoing'],
};

function filterEntries(entries: LogEntry[], mode: FilterMode): LogEntry[] {
  const types = FILTER_EVENT_TYPES[mode];
  return entries.filter((e) => types.includes(e.eventType));
}

export default function KillReportPage() {
  const { logs, activeLog } = useParsedLogs();
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [activeSessionId, setActiveSessionId] = useState<string>(() => activeLog?.sessionId ?? 'all');

  const hasLogs = logs.length > 0;

  // Determine which logs to display
  const selectedLogs: ParsedLog[] = useMemo(() => {
    if (activeSessionId === 'all') return logs;
    return logs.filter((l) => l.sessionId === activeSessionId);
  }, [logs, activeSessionId]);

  // Merge entries from selected logs
  const allEntries: LogEntry[] = useMemo(
    () => selectedLogs.flatMap((l) => l.entries),
    [selectedLogs],
  );

  const filteredEntries = useMemo(
    () => filterEntries(allEntries, filterMode),
    [allEntries, filterMode],
  );

  // Stats
  const hitsOutCount = allEntries.filter((e) => e.eventType === 'damage-dealt' || e.eventType === 'miss-outgoing').length;
  const hitsInCount = allEntries.filter((e) => e.eventType === 'damage-received').length;

  const filterButtons: { mode: FilterMode; label: string }[] = [
    { mode: 'all', label: 'ALL' },
    { mode: 'kills', label: 'HITS OUT' },
    { mode: 'losses', label: 'HITS IN' },
    { mode: 'misses', label: 'MISSES' },
  ];

  return (
    <AppLayout title="RAW DATA">
      {!hasLogs ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Panel className="text-center max-w-sm w-full">
            <div className="py-8 flex flex-col items-center gap-4">
              <div>
                <h2 className="text-text-primary font-ui font-bold uppercase tracking-widest text-lg mb-2">
                  NO LOGS PARSED
                </h2>
                <p className="text-text-muted font-mono text-sm">
                  Upload EVE combat logs to view raw combat events
                </p>
              </div>
              <Link href="/upload">
                <Button variant="primary" size="md" icon={<Upload size={14} />}>
                  UPLOAD LOGS
                </Button>
              </Link>
            </div>
          </Panel>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Session selector (only shown when multiple logs) */}
          {logs.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-text-muted font-ui text-xs uppercase tracking-widest">Session:</span>
              <button
                onClick={() => setActiveSessionId('all')}
                className={cn(
                  'font-mono text-xs px-3 py-1 border rounded-sm transition-colors',
                  activeSessionId === 'all'
                    ? 'border-cyan-dim text-cyan-glow bg-cyan-ghost'
                    : 'border-border text-text-secondary hover:border-cyan-dim hover:text-text-primary',
                )}
              >
                ALL SESSIONS
              </button>
              {logs.map((log) => (
                <button
                  key={log.sessionId}
                  onClick={() => setActiveSessionId(log.sessionId)}
                  className={cn(
                    'font-mono text-xs px-3 py-1 border rounded-sm transition-colors',
                    activeSessionId === log.sessionId
                      ? 'border-cyan-dim text-cyan-glow bg-cyan-ghost'
                      : 'border-border text-text-secondary hover:border-cyan-dim hover:text-text-primary',
                  )}
                >
                  {log.fileName}
                </button>
              ))}
            </div>
          )}

          {/* Filter bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {filterButtons.map(({ mode, label }) => (
              <Button
                key={mode}
                variant={filterMode === mode ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setFilterMode(mode)}
              >
                {label}
              </Button>
            ))}
          </div>

          {/* Stats summary bar */}
          <div className="flex items-center gap-3 text-xs font-mono text-text-muted">
            <span>
              <span className="text-text-secondary">{filteredEntries.length.toLocaleString()}</span> shown
            </span>
            <span className="text-text-muted">|</span>
            <span>
              <span className="text-status-kill">{hitsOutCount.toLocaleString()}</span> hits out
            </span>
            <span className="text-text-muted">|</span>
            <span>
              <span className="text-status-safe">{hitsInCount.toLocaleString()}</span> hits in
            </span>
          </div>

          {/* Kill table */}
          <Panel>
            {filteredEntries.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-text-muted font-mono text-xs uppercase tracking-widest">
                  NO EVENTS MATCH FILTER
                </span>
              </div>
            ) : (
              <KillTable entries={filteredEntries} />
            )}
          </Panel>
        </div>
      )}
    </AppLayout>
  );
}

// Sub-component: table with pagination
const PAGE_SIZE = 100;

function KillTable({ entries }: { entries: LogEntry[] }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = entries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-auto rounded-sm border border-border">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui border-b border-border px-3 py-2 text-left w-20">
                TIME
              </th>
              <th className="bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui border-b border-border px-3 py-2 text-left w-20">
                TYPE
              </th>
              <th className="bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui border-b border-border px-3 py-2 text-left">
                PILOT
              </th>
              <th className="bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui border-b border-border px-3 py-2 text-left">
                SHIP
              </th>
              <th className="bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui border-b border-border px-3 py-2 text-left">
                WEAPON
              </th>
              <th className="bg-panel text-text-secondary uppercase tracking-widest text-xs font-ui border-b border-border px-3 py-2 text-right w-24">
                DAMAGE
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((entry) => (
              <KillRow key={entry.id} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-text-muted text-xs">
            {entries.length.toLocaleString()} rows &middot; page{' '}
            <span className="text-text-secondary">{currentPage}</span> /{' '}
            <span className="text-text-secondary">{totalPages}</span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={cn(
                'font-mono text-xs px-3 py-1 border border-border rounded-sm',
                'text-text-secondary hover:border-cyan-dim hover:text-text-primary transition-colors',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              PREV
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                'font-mono text-xs px-3 py-1 border border-border rounded-sm',
                'text-text-secondary hover:border-cyan-dim hover:text-text-primary transition-colors',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              NEXT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
